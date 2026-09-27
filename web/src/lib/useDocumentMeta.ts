import { useEffect } from 'react'
import { SITE_URL, type PageSeo } from './seo'

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

/**
 * Keeps the document head in step with the route.
 *
 * The prerendered HTML already carries the right tags for a crawler that never
 * runs the bundle. This is for everything after that: the browser tab, a
 * bookmark, the history entry, and a client-side navigation that never asks
 * the server for a new document.
 */
export function useDocumentMeta({ title, description, path }: PageSeo) {
  useEffect(() => {
    const url = `${SITE_URL}${path === '/' ? '' : path}`
    document.title = title

    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url
  }, [title, description, path])
}
