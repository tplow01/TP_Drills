import { describe, expect, it } from 'vitest'
import {
  formatDayMarker,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  formatTime,
  isoPlusDays,
  monthGrid,
  today,
  yearMonthOf,
  yearMonthPlusMonths,
} from './dates'

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

describe('formatMonthLabel', () => {
  it('formats as full month plus year', () => {
    expect(formatMonthLabel('2026-08')).toBe('August 2026')
  })
})

describe('yearMonthPlusMonths', () => {
  it('adds months within a year', () => {
    expect(yearMonthPlusMonths('2026-08', 1)).toBe('2026-09')
  })

  it('rolls over a year boundary going forward', () => {
    expect(yearMonthPlusMonths('2026-12', 1)).toBe('2027-01')
  })

  it('rolls over a year boundary going backward', () => {
    expect(yearMonthPlusMonths('2026-01', -1)).toBe('2025-12')
  })
})

describe('yearMonthOf', () => {
  it('extracts the year-month prefix', () => {
    expect(yearMonthOf('2026-08-14')).toBe('2026-08')
  })
})

describe('monthGrid', () => {
  it('covers every day of the month with no partial weeks', () => {
    const weeks = monthGrid('2026-08')
    const allDays = weeks.flat()
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const inMonthDays = allDays.filter((d) => d.inMonth)
    expect(inMonthDays).toHaveLength(31)
    expect(inMonthDays[0].date).toBe('2026-08-01')
    expect(inMonthDays[inMonthDays.length - 1].date).toBe('2026-08-31')
  })

  it('starts weeks on Monday', () => {
    const weeks = monthGrid('2026-08')
    // 2026-08-01 is a Saturday, so the first week's Monday is 2026-07-27.
    expect(weeks[0][0].date).toBe('2026-07-27')
    expect(weeks[0][0].inMonth).toBe(false)
  })

  it('marks lead/trail days from adjacent months as out of month', () => {
    const weeks = monthGrid('2026-08')
    const allDays = weeks.flat()
    const outOfMonth = allDays.filter((d) => !d.inMonth)
    expect(outOfMonth.every((d) => !d.date.startsWith('2026-08'))).toBe(true)
  })

  it('handles a month that already starts on Monday', () => {
    // 2026-06-01 is a Monday.
    const weeks = monthGrid('2026-06')
    expect(weeks[0][0].date).toBe('2026-06-01')
    expect(weeks[0][0].inMonth).toBe(true)
  })
})
