import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-rotate',
  code: 'IMG-07',
  title: 'Rotate & Flip',
  summary: 'Turn sideways photos the right way up.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Rotate an Image — free, in your browser | Klyro',
    description:
      'Rotate photos 90 or 180 degrees, or mirror them, a whole batch at once. Runs in your browser, so the pictures stay on your device the entire time.',
    about:
      'For a scan that came out sideways, a photo some app keeps showing on its side, or a selfie that needs mirroring back. Turn a quarter at a time in either direction or flip across either axis, and every file in the batch gets the same treatment. The pixels themselves are turned, so the result looks right in every app, not only the ones that read rotation tags.',
  },
}
