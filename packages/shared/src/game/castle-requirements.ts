import type { BuildingType } from './building-types.js'

export type CastleRequirement = Partial<Record<Exclude<BuildingType, 'castle'>, number>>

export const CASTLE_REQUIREMENTS: Record<number, CastleRequirement> = {
  2: { sawmill: 1, farm: 1 },
  3: { sawmill: 2, farm: 2 },
  4: { sawmill: 3, quarry: 3 },
  5: { quarry: 4, farm: 4 },
  6: { quarry: 5, laboratory: 5 },
  7: { barracks: 6, laboratory: 6 },
  8: { shooting_range: 7, laboratory: 7 },
  9: { stable: 8, laboratory: 8 },
}
