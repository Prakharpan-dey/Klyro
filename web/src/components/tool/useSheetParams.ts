import { useState } from 'react'
import type { ExcelToPdfParams } from '@/ops/office/excelToPdf'
import type { FontFamily } from '@/ops/pdf/stamp'

/**
 * Page setup for the spreadsheet renderer, shared by the Excel, CSV and
 * OpenDocument tools so they stay identical without being maintained apart.
 */
export function useSheetParams(overrides: Partial<ExcelToPdfParams> = {}) {
  const [pageSize, setPageSize] = useState<ExcelToPdfParams['pageSize']>('a4')
  const [landscape, setLandscape] = useState(overrides.landscape ?? true)
  const [family, setFamily] = useState<FontFamily>('helvetica')
  const [size, setSize] = useState(9)
  const [marginMm, setMarginMm] = useState(14)
  const [headerRow, setHeaderRow] = useState(true)
  const [gridLines, setGridLines] = useState(true)

  const params: ExcelToPdfParams = {
    pageSize,
    landscape,
    family,
    size,
    marginMm,
    headerRow,
    gridLines,
  }

  return {
    params,
    setPageSize,
    setLandscape,
    setFamily,
    setSize,
    setMarginMm,
    setHeaderRow,
    setGridLines,
  }
}
