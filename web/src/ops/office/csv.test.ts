import { describe, expect, it } from 'vitest'
import { parseCsv, parseRows, sniffDelimiter, toCell } from './csv'
import { LegacyExcelError, readSheets } from './excelToPdf'
import { writeWorkbook } from './xlsx'

describe('splitting rows', () => {
  it('keeps a delimiter that sits inside quotes', () => {
    expect(parseRows('a,"b,c",d', ',')).toEqual([['a', 'b,c', 'd']])
  })

  it('turns a doubled quote into one quote', () => {
    expect(parseRows('"she said ""hi""",x', ',')).toEqual([['she said "hi"', 'x']])
  })

  it('keeps a line break inside a quoted field in the same cell', () => {
    expect(parseRows('"line one\nline two",b\nc,d', ',')).toEqual([
      ['line one\nline two', 'b'],
      ['c', 'd'],
    ])
  })

  it('treats CRLF as one line break', () => {
    expect(parseRows('a,b\r\nc,d\r\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('keeps empty fields, including a trailing one', () => {
    expect(parseRows('a,,c,', ',')).toEqual([['a', '', 'c', '']])
  })
})

describe('finding the separator', () => {
  it('reads a semicolon export from European Excel', () => {
    expect(sniffDelimiter('Name;Amount\nAsha;12,50\nRavi;8,00')).toBe(';')
  })

  it('reads a tab-separated file', () => {
    expect(sniffDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t')
  })

  it('is not fooled by semicolons in prose inside a comma file', () => {
    const text = 'name,note\nAsha,"late; called ahead"\nRavi,"fine; no issue"'
    expect(sniffDelimiter(text)).toBe(',')
  })
})

describe('cell values', () => {
  it('reads plain numbers as numbers', () => {
    expect(toCell('42')).toBe(42)
    expect(toCell('-3.5')).toBe(-3.5)
  })

  it('leaves anything a reader would not recognise once reformatted as text', () => {
    expect(toCell('00123')).toBe('00123')
    expect(toCell('12.50')).toBe('12.50')
    expect(toCell('1e5')).toBe('1e5')
    expect(toCell('+44 20 7946 0000')).toBe('+44 20 7946 0000')
  })

  it('treats an empty cell as empty', () => {
    expect(toCell('  ')).toBeNull()
  })
})

describe('a whole file', () => {
  it('strips the byte-order mark Excel writes before the first header', () => {
    const sheet = parseCsv('﻿Student,Score\nAsha,92\n', 'marks.csv')
    expect(sheet.rows[0][0]).toBe('Student')
    expect(sheet.name).toBe('marks')
  })

  it('drops blank lines between rows', () => {
    expect(parseCsv('a,b\n\n\nc,d\n', 'x.csv').rows).toHaveLength(2)
  })
})

describe('reading a spreadsheet by its bytes', () => {
  it('reads a CSV that claims to be an Excel file', async () => {
    // what Windows hands over when Excel is installed
    const file = new File(['Student,Score\nAsha,92\n'], 'marks.csv', {
      type: 'application/vnd.ms-excel',
    })
    const [sheet] = await readSheets(file)
    expect(sheet.rows).toEqual([
      ['Student', 'Score'],
      ['Asha', 92],
    ])
  })

  it('still reads a real .xlsx', async () => {
    const bytes = await writeWorkbook([{ name: 'S', rows: [['a', 1]] }])
    const [sheet] = await readSheets(new File([bytes as BlobPart], 'book.xlsx'))
    expect(sheet.rows[0]).toEqual(['a', 1])
  })

  it('explains an old binary .xls instead of failing on it', async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    await expect(readSheets(new File([ole], 'old.xls'))).rejects.toBeInstanceOf(LegacyExcelError)
  })

  it('honours a separator chosen by hand', async () => {
    const [sheet] = await readSheets(new File(['a|b;c'], 'x.csv'), ';')
    expect(sheet.rows[0]).toEqual(['a|b', 'c'])
  })
})
