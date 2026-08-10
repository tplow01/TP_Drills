import { describe, expect, it } from 'vitest'
import { formatDayMarker, formatLongDate, formatShortDate, formatTime, isoPlusDays, today } from './dates'

describe('today', () => {
  it('returns a YYYY-MM-DD string matching the local clock', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(today()).toBe(expected)
  })
})

describe('isoPlusDays', () => {
  it('adds days within a month', () => {
    expect(isoPlusDays('2026-08-08', 6)).toBe('2026-08-14')
  })

  it('rolls over a month boundary', () => {
    expect(isoPlusDays('2026-08-28', 6)).toBe('2026-09-03')
  })

  it('rolls over a year boundary', () => {
    expect(isoPlusDays('2026-12-29', 6)).toBe('2027-01-04')
  })

  it('supports negative offsets', () => {
    expect(isoPlusDays('2026-08-08', -10)).toBe('2026-07-29')
  })
})

describe('formatTime', () => {
  it('drops minutes on the hour', () => {
    expect(formatTime('14:00:00')).toBe('2pm')
  })

  it('keeps minutes off the hour', () => {
    expect(formatTime('14:30:00')).toBe('2:30pm')
  })

  it('handles midnight as 12am', () => {
    expect(formatTime('00:00:00')).toBe('12am')
  })

  it('handles noon as 12pm', () => {
    expect(formatTime('12:00:00')).toBe('12pm')
  })

  it('has no leading zero on the hour', () => {
    expect(formatTime('09:05:00')).toBe('9:05am')
  })
})

describe('formatLongDate', () => {
  it('formats as weekday, day, month', () => {
    expect(formatLongDate('2026-08-08')).toBe('Saturday 8 August')
  })
})

describe('formatShortDate', () => {
  it('formats as short weekday, day, short month', () => {
    expect(formatShortDate('2026-08-08')).toBe('Sat 8 Aug')
  })
})

describe('formatDayMarker', () => {
  it('formats as short weekday plus day number', () => {
    expect(formatDayMarker('2026-08-12')).toBe('Wed 12')
  })
})
