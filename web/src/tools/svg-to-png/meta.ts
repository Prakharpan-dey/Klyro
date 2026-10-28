import { SVG_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'svg-to-png',
  code: 'IMG-09',
  title: 'SVG → PNG',
  summary: 'Turn SVG icons and logos into sharp PNG, JPG or WebP at any size.',
  category: 'image',
  group: 'Image',
  accept: SVG_ACCEPT,
  multiple: true,
  seo: {
    title: 'SVG to PNG — any size, transparent, free | Klyro',
    description:
      'Convert SVG to PNG, JPG or WebP at 1×, 2×, 4× or an exact width, with a transparent or white background. In your browser, no upload, no watermark.',
    about:
      'An SVG is drawn fresh at the size you ask for, so a 24 pixel icon comes out just as sharp at 2000 pixels. PNG keeps the transparent parts; JPG gets a white background, since it has no transparency. The file is drawn the way a browser shows an image, so any script inside it does not run and nothing it links to is fetched.',
  },
}
