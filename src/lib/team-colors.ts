/**
 * A small fixed palette for team color-coding across the Schedule (sidebar
 * key, session rows, month dots) — index-based, so the same team keeps the
 * same color for as long as the team list's order is stable (`listTeams`
 * orders by name, so it only reshuffles if a team is renamed).
 */
const TEAM_COLORS = [
  '#39d97a', // accent green
  '#5ea1ff', // blue
  '#ff9f5e', // orange
  '#c792ea', // purple
  '#ff6e6e', // coral
  '#f0d264', // yellow
  '#4dd0e1', // teal
  '#ff8fc7', // pink
]

/** Cycles through the palette once there are more teams than colors. */
export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}

/** Maps every team's id to its color, in one pass — the sidebar key and every colored dot/bar share this same map so a team's color is consistent everywhere on the screen. */
export function teamColorMap(teams: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  teams.forEach((team, i) => map.set(team.id, teamColor(i)))
  return map
}
