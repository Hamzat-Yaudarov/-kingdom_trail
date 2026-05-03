import type { BuildingType } from '../game/building-types'
import type { Language, PlayerResources } from './game-state'

export type PlayerRow = {
  id: string
  telegram_id: string
  username: string | null
  first_name: string | null
  language: Language
  tutorial_completed: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
} & PlayerResources

export type PlayerBuildingRow = {
  id: string
  player_id: string
  building_type: BuildingType
  level: number
  is_built: boolean
  slot_id: string
  last_collected_at: string | null
  created_at: string
  updated_at: string
}

export type ConstructionQueueRow = {
  id: string
  player_id: string
  building_type: BuildingType
  target_level: number
  started_at: string
  ends_at: string
  status: 'active' | 'completed' | 'cancelled'
  speedup_spent_diamonds: number
  created_at: string
  updated_at: string
}
