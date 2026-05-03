import type { BuildingType } from './building-types.js'

export type SlotId =
  | 'castle_slot'
  | 'sawmill_slot'
  | 'farm_slot'
  | 'quarry_slot'
  | 'barracks_slot'
  | 'laboratory_slot'
  | 'shooting_range_slot'
  | 'stable_slot'

export type BaseSlot = {
  slotId: SlotId
  buildingType: BuildingType
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  zIndex: number
}

export const BASE_SLOTS: BaseSlot[] = [
  { slotId: 'castle_slot', buildingType: 'castle', xPercent: 49, yPercent: 18, widthPercent: 28, heightPercent: 16, zIndex: 30 },
  { slotId: 'sawmill_slot', buildingType: 'sawmill', xPercent: 25, yPercent: 28, widthPercent: 21, heightPercent: 12, zIndex: 22 },
  { slotId: 'farm_slot', buildingType: 'farm', xPercent: 74, yPercent: 28, widthPercent: 21, heightPercent: 12, zIndex: 22 },
  { slotId: 'barracks_slot', buildingType: 'barracks', xPercent: 34, yPercent: 40, widthPercent: 20, heightPercent: 12, zIndex: 21 },
  { slotId: 'laboratory_slot', buildingType: 'laboratory', xPercent: 65, yPercent: 40, widthPercent: 20, heightPercent: 12, zIndex: 21 },
  { slotId: 'quarry_slot', buildingType: 'quarry', xPercent: 49, yPercent: 53, widthPercent: 23, heightPercent: 13, zIndex: 20 },
  { slotId: 'shooting_range_slot', buildingType: 'shooting_range', xPercent: 37, yPercent: 69, widthPercent: 22, heightPercent: 12, zIndex: 18 },
  { slotId: 'stable_slot', buildingType: 'stable', xPercent: 62, yPercent: 84, widthPercent: 22, heightPercent: 12, zIndex: 16 },
]
