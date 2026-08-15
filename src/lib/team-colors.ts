/**
 * A small fixed palette for team color-coding across the Schedule (sidebar
 * key, session rows, month dots) — index-based by default, so a team with
 * no explicit `color` keeps the same color for as long as the team list's
 * order is stable (`listTeams` orders by name, so it only reshuffles if a
 * team is renamed). A team can also have an explicit `color` chosen at
 * creation (design doc, 2026-08-15), which always wins over the index.
 */
export const TEAM_COLORS = [
  '#39d97a', // accent green
  '#5ea1ff', // blue
  '#ff9f5e', // orange
  '#c792ea', // purple
  '#ff6e6e', // coral
  '#f0d264', // yellow
  '#4dd0e1', // teal
  '#ff8fc7', // pink
] as const

/** Cycles through the palette once there are more teams than colors. */
export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}

/**
 * Maps every team's id to its color, in one pass. Each team's own `color`
 * wins if set; otherwise falls back to its position in the list. The
 * sidebar key and every colored dot/bar share this same map so a team's
 * color is consistent everywhere on the screen.
 */
export function teamColorMap(teams: { id: string; color?: string | null }[]): Map<string, string> {
  const map = new Map<string, string>()
  teams.forEach((team, i) => map.set(team.id, team.color ?? teamColor(i)))
  return map
}

/**
 * A sensible default to pre-select in the team-creation color picker: the
 * first palette color not already used by an existing team's explicit
 * `color`, or the first color if every palette entry is already taken.
 * Purely a suggestion — the coach can pick any swatch instead.
 */
export function suggestedTeamColor(existingColors: (string | null)[]): string {
  const used = new Set(existingColors.filter((c): c is string => c !== null))
  return TEAM_COLORS.find((c) => !used.has(c)) ?? TEAM_COLORS[0]
}
