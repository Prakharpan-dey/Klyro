import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'images-to-pptx',
  code: 'PDF-60',
  title: 'Images → PowerPoint',
  summary: 'Build a slide deck from photos, in order.',
  category: 'pdf',
  group: 'Convert',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Images to PowerPoint — free, in your browser | Klyro',
    description:
      'Put photos and screenshots into a PowerPoint deck, one per slide, in the order you choose. Built in your browser, so the pictures never leave your device.',
    about:
      'For a quick slideshow of event photos, a stack of screenshots for a walkthrough, or scanned pages you need to present. Drag the images into order and each one becomes its own slide, fitted without stretching. Phone photos keep the way up they were taken. Choose widescreen, the older 4:3 shape, or a deck shaped like your first picture.',
  },
}
