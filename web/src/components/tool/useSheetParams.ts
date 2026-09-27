import { useState } from 'react'
import type { ExcelToPdfParams } from '@/ops/office/excelToPdf'
import type { FontFamily } from '@/ops/pdf/stamp'

/**
 * Page setup for the spreadsheet renderer, shared by the Excel and
 * OpenDocument tools so the two stay identical without being maintained twice.
 */
export function useSheetParams() {
  const [pageSize, setPageSize] = useState<ExcelToPdfParams['pageSize']>('a4')
  const [landscape, setLandscape] = useState(true)
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
