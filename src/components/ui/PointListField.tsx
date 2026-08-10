'use client'

import { Button } from './Button'
import { Field } from './Field'
import { TextInput } from './TextInput'

export function PointListField({
  label,
  values,
  onChange,
  addLabel,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  addLabel: string
  placeholder?: (index: number) => string
}) {
  return (
    <Field label={label}>
      <>
        {values.map((point, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
            <div style={{ flex: 1 }}>
              <TextInput
                value={point}
                placeholder={placeholder ? placeholder(i) : undefined}
                onChange={(value) => {
                  const next = [...values]
                  next[i] = value
                  onChange(next)
                }}
              />
            </div>
            {values.length > 1 && (
              <Button variant="muted" onClick={() => onChange(values.filter((_, j) => j !== i))}>
                ×
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" onClick={() => onChange([...values, ''])}>
          {addLabel}
        </Button>
      </>
    </Field>
  )
}
