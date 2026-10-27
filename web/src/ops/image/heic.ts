/**
 * HEIC, the format every iPhone has saved photos in since 2017.
 *
 * Safari decodes it; Chrome and Firefox do not, so on most desktops every image
 * tool used to turn an iPhone photo away. This hands the rest of the pipeline
 * something it can read: the file untouched where the browser copes, otherwise
 * a PNG decoded by libheif compiled to WebAssembly.
 *
 * The decoder is about 2 MB and is fetched from this origin only when a HEIC
 * file actually arrives — its WebAssembly is embedded in the module itself, so
 * there is no second request and nothing for the content security policy to
 * block. libheif applies the photo's own rotation while decoding, so the PNG is
 * already the right way up and nothing downstream turns it again.
 */

export class HeicError extends Error {
  constructor() {
    super('This HEIC photo could not be read. It may be damaged, or a format variant the decoder does not support.')
  }
}

const HEIC_TYPE = /^image\/hei[cf](-sequence)?$/i
const HEIC_NAME = /\.hei[cf]$/i

export function isHeic(blob: Blob & { name?: string }): boolean {
  return HEIC_TYPE.test(blob.type) || HEIC_NAME.test(blob.name ?? '')
}

interface HeifImage {
  get_width(): number
  get_height(): number
  is_primary(): boolean
  display(target: ImageData, done: (result: ImageData | null) => void): void
  free(): void
}

interface Libheif {
  HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] }
}

let loading: Promise<Libheif> | null = null

function libheif(): Promise<Libheif> {
  loading ??= import('libheif-js/libheif-wasm/libheif-bundle.mjs').then(
    async (module) => (await module.default()) as Libheif,
  )
  return loading
}

async function nativelyDecodable(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob)
    bitmap.close()
    return true
  } catch {
    return false
  }
}

async function encodePng(pixels: ImageData): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(pixels.width, pixels.height)
    canvas.getContext('2d')!.putImageData(pixels, 0, 0)
    return canvas.convertToBlob({ type: 'image/png' })
  }
  const canvas = document.createElement('canvas')
  canvas.width = pixels.width
  canvas.height = pixels.height
  canvas.getContext('2d')!.putImageData(pixels, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new HeicError())), 'image/png'),
  )
}

/** The blob itself when the browser can read it; otherwise a decoded PNG. */
export async function toDecodable(blob: Blob & { name?: string }): Promise<Blob> {
  if (!isHeic(blob)) return blob
  // Safari reads HEIC itself, and then nothing extra needs to load
  if (await nativelyDecodable(blob)) return blob

  const { HeifDecoder } = await libheif()
  const images = new HeifDecoder().decode(new Uint8Array(await blob.arrayBuffer()))
  // a burst or a Live Photo holds several images; the primary is the photo
  const image = images.find((candidate) => candidate.is_primary()) ?? images[0]
  if (!image) throw new HeicError()

  try {
    const pixels = new ImageData(image.get_width(), image.get_height())
    await new Promise<void>((resolve, reject) =>
      image.display(pixels, (result) => (result ? resolve() : reject(new HeicError()))),
    )
    return await encodePng(pixels)
  } finally {
    for (const each of images) each.free()
  }
}
