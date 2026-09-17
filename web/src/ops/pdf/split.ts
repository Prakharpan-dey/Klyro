import { chunkPages, parsePageList, parsePageRanges } from '@/lib/pageRange'
import type { OutputFile, Progress } from '../types'
import { loadPdf } from './load'
import { extractGroups } from './pages'

export type SplitParams =
  | { mode: 'ranges'; ranges: string }
  | { mode: 'every'; size: number }
  | { mode: 'extract'; pages: string }

export async function splitPdf(
  file: File,
  params: SplitParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  onProgress?.(0, 1, 'Reading')
  const count = (await loadPdf(file)).getPageCount()

  let groups: number[][]
  if (params.mode === 'every') {
    if (!Number.isInteger(params.size) || params.size < 1)
      throw new Error('Pages per file must be 1 or more')
    groups = chunkPages(count, params.size)
  } else if (params.mode === 'ranges') {
    const parsed = parsePageRanges(params.ranges, count)
    if (parsed.error) throw new Error(parsed.error)
    groups = parsed.groups
  } else {
    const parsed = parsePageList(params.pages, count)
    if (parsed.error) throw new Error(parsed.error)
    groups = [parsed.pages]
  }

  onProgress?.(0, 1, `Writing ${groups.length} file${groups.length === 1 ? '' : 's'}`)
  const results = await extractGroups(file, groups)
  onProgress?.(1, 1, 'Done')
  return results
}
