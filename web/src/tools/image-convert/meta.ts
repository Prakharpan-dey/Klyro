import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-convert',
  code: 'IMG-03',
  title: 'Convert',
  summary: 'Switch between JPG, PNG, WebP and AVIF.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Convert an Image — JPG, PNG, WebP, AVIF | Klyro',
    description:
      'Switch images between JPG, PNG, WebP and AVIF without uploading them. Conversion runs in your browser using its own encoders. Free, batch, no account.',
    about:
      "For when something will only accept one format, or when WebP would halve the size of a page asset. Pick the target format and a quality, and the browser's own encoders do the work. Transparency survives into PNG and WebP and is flattened into JPG, which the tool warns about first.",
  },
}
