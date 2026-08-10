'use client'

const baseStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--field-bg)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontFamily: 'var(--font-mona), system-ui, sans-serif',
  fontWeight: 500,
  letterSpacing: '-0.005em',
  fontSize: 14,
  color: 'var(--ink)',
  colorScheme: 'dark',
}

export function TextInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  min,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  type?: 'text' | 'number' | 'date' | 'time'
  min?: number
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={baseStyle}
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 80,
  maxLength,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  /** Optional character cap. When set, a counter appears once the coach is close to or at the limit, rather than truncating silently. */
  maxLength?: number
}) {
  const nearLimit = maxLength !== undefined && value.length >= maxLength * 0.9

  return (
    <div>
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...baseStyle, minHeight, resize: 'vertical' }}
      />
      {maxLength !== undefined && nearLimit && (
        <div
          style={{
            fontSize: 11,
            color: value.length >= maxLength ? 'var(--accent)' : 'var(--ink-45)',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  )
}
