import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-exif',
  code: 'IMG-04',
  title: 'Photo Privacy',
  summary: 'See what a photo knows about you, and remove it.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Remove EXIF Data from Photos — free | Klyro',
    description:
      'See what a photo is carrying — camera, date, GPS location — and strip it out. Reading and removal happen in your browser, so the photo is never uploaded.',
    about:
      'A phone photo usually records where it was taken. This shows you exactly what is in the file, including coordinates, and removes it without touching a single pixel of the image. The read happens in this tab, which matters: uploading a photo to have its location removed defeats the exercise.',
  },
}
