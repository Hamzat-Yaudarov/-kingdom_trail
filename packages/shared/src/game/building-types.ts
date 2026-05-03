export const BUILDING_TYPES = [
  'castle',
  'sawmill',
  'quarry',
  'farm',
  'barracks',
  'shooting_range',
  'stable',
  'laboratory',
] as const

export type BuildingType = (typeof BUILDING_TYPES)[number]

export const RESOURCE_BUILDINGS: BuildingType[] = ['sawmill', 'quarry', 'farm']
