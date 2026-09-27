import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { Slider } from '@/components/ui/slider'
import type { useLayoutParams } from './useLayoutParams'

export function LayoutFields({ layout }: { layout: ReturnType<typeof useLayoutParams> }) {
  const { params } = layout

  return (
    <>
      <Field label="Page size">
        <Segmented
          label="Page size"
          value={params.pageSize}
          onChange={layout.setPageSize}
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
          onChange={layout.setFamily}
          options={[
            { value: 'times', label: 'Serif' },
            { value: 'helvetica', label: 'Sans' },
            { value: 'courier', label: 'Mono' },
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Size" aside={`${params.size} pt`}>
          <Slider
            min={8}
            max={16}
            value={[params.size]}
            onValueChange={([v]) => layout.setSize(v)}
            aria-label="Body text size"
          />
        </Field>
        <Field label="Margin" aside={`${params.marginMm} mm`}>
          <Slider
            min={10}
            max={40}
            value={[params.marginMm]}
            onValueChange={([v]) => layout.setMarginMm(v)}
            aria-label="Margin"
          />
        </Field>
      </div>

      <Field label="Line spacing" aside={`${params.leading.toFixed(2)}×`}>
        <Slider
          min={1.1}
          max={2}
          step={0.05}
          value={[params.leading]}
          onValueChange={([v]) => layout.setLeading(v)}
          aria-label="Line spacing"
        />
      </Field>
    </>
  )
}
