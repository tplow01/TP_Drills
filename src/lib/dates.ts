/**
 * Shared date/time helpers, consolidated from copies that had drifted across
 * the Hub, Schedule, Planner, Session view and Reflect route (whole-branch
 * review finding 8). Pure logic, no I/O — safe to call from server and
 * client code alike, except `today()` which is documented server-only below.
 */

/**
 * Today as 'YYYY-MM-DD' in the local time of wherever this runs.
 *
 * Server-safe: call this only from Server Components/pages/route handlers,
 * where "local time" means the server's clock. Client components must
 * receive today's date as a prop from their server-rendering parent instead
 * of calling this themselves — otherwise the same session can show a
 * different state tag on different screens near a timezone boundary
 * (finding 4). Deliberately not named `todayLocal`/`todayISO` per-call-site;
 * one function, one name, one source of truth.
 */
export function today(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today plus `days`, as 'YYYY-MM-DD'. */
export function isoPlusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** '14:30:00' -> '2:30pm'. No leading zero, minutes dropped on the hour. */
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const period = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${minuteStr}${period}`
}

/** Long-form date, e.g. "Saturday 8 August". Parsed as a plain calendar date. */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d))
}

/** Short weekday + day for a day marker, e.g. "Tue 12". */
export function formatDayMarker(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date)
  return `${weekday} ${d}`
}

/** 'YYYY-MM-DD' -> 'Tue 15 Jul', parsed as a plain calendar date. */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

/** 'YYYY-MM' -> 'August 2026'. */
export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

/** 'YYYY-MM' plus `months` (may be negative), as 'YYYY-MM'. */
export function yearMonthPlusMonths(yearMonth: string, months: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const date = new Date(y, m - 1 + months, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** The 'YYYY-MM' containing `iso`. */
export function yearMonthOf(iso: string): string {
  return iso.slice(0, 7)
}

/**
 * Full weeks (Mon-first) covering every day of `yearMonth`, so the grid has
 * no partial rows. Each day carries `inMonth` for dimming the lead/trail days
 * that belong to adjacent months.
 */
export function monthGrid(yearMonth: string): { date: string; inMonth: boolean }[][] {
  const [y, m] = yearMonth.split('-').map(Number)
  const firstOfMonth = new Date(y, m - 1, 1)
  const lastOfMonth = new Date(y, m, 0)

  // JS getDay(): 0=Sun..6=Sat. Convert to Mon-first offset (0=Mon..6=Sun).
  const leadDays = (firstOfMonth.getDay() + 6) % 7
  const trailDays = (7 - ((lastOfMonth.getDay() + 6) % 7) - 1 + 7) % 7

  const start = new Date(y, m - 1, 1 - leadDays)
  const totalDays = leadDays + lastOfMonth.getDate() + trailDays

  const days: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < totalDays; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ date: iso, inMonth: d.getMonth() === m - 1 })
  }

  const weeks: { date: string; inMonth: boolean }[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}
