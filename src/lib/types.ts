export type Library = 'outfield' | 'goalkeeping'

export type AgeBand = 'U6-U8' | 'U9-U11'

export type OutfieldType =
  | 'warm_up' | 'passing' | 'dribbling' | 'shooting' | 'finishing'
  | 'defending' | 'possession_rondo' | 'small_sided_game' | 'fun_cooldown'

export type GkType =
  | 'gk_warmup_handling' | 'shot_stopping' | 'footwork' | 'distribution'
  | 'crosses' | 'positioning' | 'reactions' | 'one_v_ones'

export type DrillType = OutfieldType | GkType

export interface Drill {
  id: string
  library: Library
  name: string
  type: DrillType
  age_band: AgeBand | null
  suitable_from: string | null
  duration_mins: number | null
  players_min: number | null
  players_max: number | null
  goals_needed: number
  cones_needed: number
  bibs_needed: boolean
  image_url: string | null
  setup: string[]
  how_it_works: string[]
  coaching_points: string[]
  progressions: string | null
  source: string | null
  tags: string[]
  is_draft: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

/** Fields a form supplies. `library` is set once at creation and never changes. */
export type DrillInput = Omit<
  Drill,
  'id' | 'deleted_at' | 'created_at' | 'updated_at'
>

export interface Team {
  id: string
  name: string
  library: Library
  age_band: AgeBand | null
  byga_url: string | null
  created_at: string
}

export interface Session {
  id: string
  team_id: string | null
  name: string
  library: Library
  date: string | null           // 'YYYY-MM-DD'
  start_time: string | null     // 'HH:MM:SS'
  location: string | null
  target_minutes: number
  age_band: AgeBand | null
  session_notes: string | null
  reflected_at: string | null
  created_at: string
  updated_at: string
}

export type SessionInput = Omit<
  Session,
  'id' | 'created_at' | 'updated_at' | 'reflected_at'
>

export interface SessionDrill {
  id: string
  session_id: string
  drill_id: string
  position: number
  duration_override: number | null
  rating: number | null
  note: string | null
}

export type SessionDrillInput = Omit<SessionDrill, 'id'>

/** A session_drill joined to the drill it points at. */
export interface SessionDrillWithDrill extends SessionDrill {
  drill: Drill
}

export interface SessionWithDrills extends Session {
  drills: SessionDrillWithDrill[]
}

export interface DrillStats {
  drill_id: string
  times_used: number
  avg_rating: number | null
}
