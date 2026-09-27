import type { ToolMeta } from '@/tools/types'

/** Where the canonical copy of this site lives. Used for canonical and og:url. */
export const SITE_URL = 'https://klyro.zeusdotdev.app'

export const SITE_NAME = 'Klyro'
export const SITE_TITLE = 'Klyro — file tools that never upload your files'
export const SITE_DESCRIPTION =
  '56 image, PDF and video tools that run entirely in your browser. No upload, no account, and a live counter on the page proving nothing left the tab.'

export interface PageSeo {
  title: string
  description: string
  /** path with a leading slash, e.g. /tools/pdf-merge */
  path: string
}

/**
 * A tool's page metadata, falling back to something serviceable when its `seo`
 * block has not been written yet. The fallback is deliberately plain: a wrong
 * guess at a head term is worse than no guess.
 */
export function toolSeo(meta: ToolMeta): PageSeo {
  return {
    title: meta.seo?.title ?? `${meta.title} — ${SITE_NAME}`,
    description: meta.seo?.description ?? `${meta.summary} Runs entirely in your browser.`,
    path: `/tools/${meta.slug}`,
  }
}

export const PAGE_SEO: Record<string, PageSeo> = {
  '/': { title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/' },
  '/console': {
    title: 'Console — describe a file job in one sentence | Klyro',
    description:
      'Say what you want done and Klyro plans the steps, then runs them on your own machine. Only the sentence and each file’s size are ever sent — never the file.',
    path: '/console',
  },
  '/privacy': {
    title: 'How Klyro keeps your files private | Klyro',
    description:
      'Exactly what leaves your machine and what never does. No upload endpoint, a Content-Security-Policy that enforces it, and a counter you can watch.',
    path: '/privacy',
  },
}
