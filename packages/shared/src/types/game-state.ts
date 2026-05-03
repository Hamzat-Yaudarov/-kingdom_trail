import type { BuildingType } from '../game/building-types'
import type { ResourceType } from '../game/resource-types'

export type Language = 'ru' | 'en'
export type SlotState = 'locked' | 'available' | 'building' | 'built'

export type PlayerResources = {
  wood: number
  stone: number
  food: number
  diamonds: number
}

export type BuildingView = {
  buildingType: BuildingType
  slotId: string
  level: number
  isBuilt: boolean
  state: SlotState
  canBuild: boolean
  canUpgrade: boolean
  canCollect: boolean
  accumulatedResource: number
  producedResource: ResourceType | null
  nextCost: PlayerResources | null
  nextDurationSeconds: number | null
  unlockAtCastleLevel: number | null
  visualStage: 1 | 2 | 3 | null
}

export type ActiveConstruction = {
  buildingType: BuildingType
  targetLevel: number
  startedAt: string
  endsAt: string
  remainingSeconds: number
  speedupCost: number
}

export type GameState = {
  player: {
    id: string
    firstName: string | null
    username: string | null
    language: Language
    tutorialCompleted: boolean
    resources: PlayerResources
  }
  buildings: BuildingView[]
  activeConstruction: ActiveConstruction | null
}
