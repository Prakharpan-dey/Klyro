import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { useSheetParams } from './useSheetParams'

export function SheetFields({ sheet }: { sheet: ReturnType<typeof useSheetParams> }) {
  const { params } = sheet

  const toggles = [
    ['Landscape', params.landscape, sheet.setLandscape, 'sf-land'] as const,
    ['Repeat the first row', params.headerRow, sheet.setHeaderRow, 'sf-head'] as const,
    ['Draw grid lines', params.gridLines, sheet.setGridLines, 'sf-grid'] as const,
  ]

  return (
    <>
      <Field label="Page size">
        <Segmented
          label="Page size"
          value={params.pageSize}
          onChange={sheet.setPageSize}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'Letter' },
          ]}
        />
      </Field>

      <Field label="Font">
        <Segmented
          label="Font"
          value={params.family}
          onChange={sheet.setFamily}
          options={[
            { value: 'helvetica', label: 'Sans' },
            { value: 'times', label: 'Serif' },
            { value: 'courier', label: 'Mono' },
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Size" aside={`${params.size} pt`}>
          <Slider
            min={6}
            max={14}
            value={[params.size]}
            onValueChange={([v]) => sheet.setSize(v)}
            aria-label="Font size"
          />
        </Field>
        <Field label="Margin" aside={`${params.marginMm} mm`}>
          <Slider
            min={6}
            max={30}
            value={[params.marginMm]}
            onValueChange={([v]) => sheet.setMarginMm(v)}
            aria-label="Margin"
          />
        </Field>
      </div>

      <Field label="Layout">
        <div className="flex flex-col gap-2.5">
          {toggles.map(([label, value, set, id]) => (
            <div key={id} className="flex items-center justify-between gap-3">
              <Label htmlFor={id} className="label">
                {label}
              </Label>
              <Switch id={id} checked={value} onCheckedChange={set} />
            </div>
          ))}
        </div>
      </Field>
    </>
  )
}
