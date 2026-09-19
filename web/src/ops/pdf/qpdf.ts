import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'
import type { OutputFile } from '../types'
import { baseName } from './load'

/**
 * qpdf compiled to WebAssembly, used for the things pdf-lib cannot do:
 * encryption, decryption, structural repair and linearisation.
 *
 * The .wasm ships with the site, so no request ever leaves this origin.
 */

interface QpdfFS {
  writeFile: (path: string, data: Uint8Array) => void
  readFile: (path: string) => Uint8Array
}

interface QpdfInstance {
  callMain: (args: string[]) => number
  FS: QpdfFS
}

export class QpdfError extends Error {}

async function createInstance(): Promise<QpdfInstance> {
  const factory = (await import('@neslinesli93/qpdf-wasm')).default as unknown as (opts: {
    locateFile: () => string
    noExitRuntime?: boolean
    print?: (line: string) => void
    printErr?: (line: string) => void
  }) => Promise<QpdfInstance>

  const log: string[] = []
  const instance = await factory({
    locateFile: () => wasmUrl,
    noExitRuntime: true,
    print: (line) => log.push(line),
    printErr: (line) => log.push(line),
  })
  ;(instance as QpdfInstance & { log: string[] }).log = log
  return instance
}

/** Pull the most useful line out of qpdf's output, without the temp paths it prints. */
function explain(log: string[]): string | null {
  const lines = log
    .map((line) =>
      line
        .replace(/^[^:]*:\s*/, '')
        .replace(/^\/input\.pdf[^:]*:\s*/, '')
        .trim(),
    )
    .filter(Boolean)
  if (!lines.length) return null
  const notable = lines.filter((line) =>
    /password|damaged|invalid|cannot|can't|unsupported/i.test(line),
  )
  return (notable.at(-1) ?? lines.at(-1)) as string
}

interface RunOptions {
  file: File
  /** arguments before the input and output paths */
  args: string[]
  suffix: string
  /** message shown when qpdf refuses the file */
  failure: string
}

async function runQpdf({ file, args, suffix, failure }: RunOptions): Promise<OutputFile> {
  const instance = await createInstance()
  const input = '/input.pdf'
  const output = '/output.pdf'

  instance.FS.writeFile(input, new Uint8Array(await file.arrayBuffer()))

  let code: number
  try {
    code = instance.callMain([...args, input, output])
  } catch (err) {
    throw new QpdfError(err instanceof Error && err.message ? err.message : failure)
  }

  // qpdf returns 0 for success and 3 for "succeeded with warnings"
  let bytes: Uint8Array | null = null
  try {
    bytes = instance.FS.readFile(output)
  } catch {
    bytes = null
  }

  if (!bytes?.length || (code !== 0 && code !== 3)) {
    const detail = explain((instance as QpdfInstance & { log?: string[] }).log ?? [])
    const repeats = detail && /password/i.test(failure) && /password/i.test(detail)
    throw new QpdfError(detail && !repeats ? `${failure} (${detail})` : failure)
  }
  return {
    file: new File([bytes as BlobPart], `${baseName(file.name)}${suffix}.pdf`, {
      type: 'application/pdf',
    }),
    sourceName: file.name,
    sourceSize: file.size,
    note: code === 3 ? 'done, with warnings' : undefined,
  }
}

export interface EncryptParams {
  /** password needed to open the document; empty means anyone can open it */
  userPassword: string
  /** password needed to change permissions; defaults to the user password */
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowModifying: boolean
}

export async function encryptPdf(file: File, params: EncryptParams): Promise<OutputFile> {
  const owner = params.ownerPassword?.trim() || params.userPassword
  if (!params.userPassword && !owner) throw new QpdfError('Choose at least one password')

  const args = [
    '--encrypt',
    params.userPassword,
    owner,
    '256',
    `--print=${params.allowPrinting ? 'full' : 'none'}`,
    `--extract=${params.allowCopying ? 'y' : 'n'}`,
    `--modify=${params.allowModifying ? 'all' : 'none'}`,
    '--',
  ]

  return runQpdf({
    file,
    args,
    suffix: '-encrypted',
    failure: 'This PDF could not be encrypted',
  })
}

export async function decryptPdf(file: File, password: string): Promise<OutputFile> {
  return runQpdf({
    file,
    args: [`--password=${password}`, '--decrypt'],
    suffix: '-decrypted',
    failure: 'Wrong password, or this PDF cannot be decrypted',
  })
}

export async function repairPdf(file: File): Promise<OutputFile> {
  return runQpdf({
    file,
    args: ['--object-streams=generate'],
    suffix: '-repaired',
    failure: 'This file is damaged beyond what qpdf can rebuild',
  })
}

export async function linearizePdf(file: File): Promise<OutputFile> {
  return runQpdf({
    file,
    args: ['--linearize'],
    suffix: '-web',
    failure: 'This PDF could not be linearised',
  })
}

/**
 * Rewrites the file from the trailer down. qpdf rebuilds the object table by
 * walking what is actually reachable, so anything that was merely unlinked —
 * a deleted annotation, a dropped attachment, an unhooked XMP packet — is not
 * written out at all. pdf-lib alone cannot do this: it serialises every object
 * ever registered, reachable or not.
 */
export async function collectGarbagePdf(file: File): Promise<OutputFile> {
  return runQpdf({
    file,
    args: ['--object-streams=generate', '--remove-unreferenced-resources=yes'],
    suffix: '-tidied',
    failure: 'This PDF could not be rebuilt',
  })
}

/**
 * The same document with nothing compressed, so its bytes can be searched for
 * a name that is supposed to be gone. Compressed streams would hide it.
 */
export async function expandPdf(file: File): Promise<OutputFile> {
  return runQpdf({
    file,
    args: ['--stream-data=uncompress', '--object-streams=disable', '--decode-level=all'],
    suffix: '-expanded',
    failure: 'This PDF could not be expanded',
  })
}
