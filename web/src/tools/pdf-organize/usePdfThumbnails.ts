import { useEffect, useState } from 'react'
import { closePdf, openPdf, renderThumbnail } from '@/ops/pdf/pdfjs'

interface ThumbState {
  file?: File
  count: number
  urls: string[]
  error?: string
}

const THUMB_WIDTH = 140

/** Renders page thumbnails one after another so the first pages show up quickly. */
export function usePdfThumbnails(file: File | undefined) {
  const [state, setState] = useState<ThumbState>({ count: 0, urls: [] })

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const created: string[] = []

    ;(async () => {
      try {
        const doc = await openPdf(file)
        if (cancelled) return closePdf(doc)
        setState({ file, count: doc.numPages, urls: [] })

        for (let i = 0; i < doc.numPages && !cancelled; i++) {
          const canvas = await renderThumbnail(doc, i, THUMB_WIDTH)
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
          if (!blob || cancelled) break
          const url = URL.createObjectURL(blob)
          created.push(url)
          setState((s) => {
            const urls = [...s.urls]
            urls[i] = url
            return { ...s, urls }
          })
        }
        await closePdf(doc)
      } catch (err) {
        if (!cancelled) {
          const locked = err instanceof Error && err.name === 'PasswordException'
          setState({
            file,
            count: 0,
            urls: [],
            error: locked
              ? 'This PDF is password protected'
              : 'This file could not be read as a PDF',
          })
        }
      }
    })()

    return () => {
      cancelled = true
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [file])

  // ignore results that belong to a previous file
  return state.file === file ? state : { count: 0, urls: [] as string[] }
}
