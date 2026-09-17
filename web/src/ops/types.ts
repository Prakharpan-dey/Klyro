export interface OutputFile {
  file: File
  sourceName: string
  sourceSize: number
  width?: number
  height?: number
  /** short readout shown next to the result, e.g. "Q 0.62" */
  note?: string
  /** set when the result is usable but did not meet the request */
  warning?: string
}

export type Progress = (done: number, total: number, label: string) => void
