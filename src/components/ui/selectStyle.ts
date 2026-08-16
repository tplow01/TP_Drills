/** Shared style for plain `<select>` elements across the drill forms — kept
    as one source so the type dropdown looks identical on both the minimal
    Add Drill screen and the full edit form. */
export const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--field-bg)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontWeight: 500,
  fontSize: 14,
  color: 'var(--ink)',
}
