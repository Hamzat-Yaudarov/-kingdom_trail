import type { BuildingType } from './building-types'
import { hours, minutes, ZERO_COSTS } from './economy'
import type { ResourceCosts, ResourceType } from './resource-types'
import type { SlotId } from './slots'

export type BuildingLevelData = {
  cost: ResourceCosts
  durationSeconds: number
  productionPerHour: number
}

export type BuildingConfig = {
  type: BuildingType
  slotId: SlotId
  producedResource: ResourceType | null
  unlockAtCastleLevel: number
  levels: Record<number, BuildingLevelData>
}

function data(cost: ResourceCosts, durationSeconds: number, productionPerHour = 0): BuildingLevelData {
  return { cost, durationSeconds, productionPerHour }
}

const commonLevels = (rows: Array<BuildingLevelData>) =>
  Object.fromEntries(rows.map((row, index) => [index + 1, row])) as Record<number, BuildingLevelData>

export const BUILDING_CONFIG: Record<BuildingType, BuildingConfig> = {
  castle: {
    type: 'castle',
    slotId: 'castle_slot',
    producedResource: null,
    unlockAtCastleLevel: 1,
    levels: commonLevels([
      data(ZERO_COSTS, 0),
      data({ wood: 120, stone: 40, food: 100 }, minutes(5)),
      data({ wood: 250, stone: 120, food: 220 }, minutes(15)),
      data({ wood: 500, stone: 260, food: 420 }, minutes(45)),
      data({ wood: 900, stone: 520, food: 700 }, hours(3)),
      data({ wood: 1500, stone: 900, food: 1200 }, hours(8)),
      data({ wood: 2300, stone: 1500, food: 1700 }, hours(15)),
      data({ wood: 3400, stone: 2300, food: 2500 }, hours(22)),
      data({ wood: 5000, stone: 3400, food: 3600 }, hours(30)),
    ]),
  },
  sawmill: {
    type: 'sawmill',
    slotId: 'sawmill_slot',
    producedResource: 'wood',
    unlockAtCastleLevel: 1,
    levels: commonLevels([
      data({ wood: 50, stone: 0, food: 30 }, minutes(1), 35),
      data({ wood: 80, stone: 0, food: 45 }, minutes(3), 50),
      data({ wood: 120, stone: 20, food: 70 }, minutes(7), 70),
      data({ wood: 180, stone: 40, food: 110 }, minutes(20), 95),
      data({ wood: 260, stone: 70, food: 160 }, minutes(45), 125),
      data({ wood: 380, stone: 110, food: 240 }, hours(2), 170),
      data({ wood: 520, stone: 180, food: 320 }, hours(4), 225),
      data({ wood: 700, stone: 260, food: 450 }, hours(10), 295),
      data({ wood: 950, stone: 380, food: 620 }, hours(18), 380),
    ]),
  },
  quarry: {
    type: 'quarry',
    slotId: 'quarry_slot',
    producedResource: 'stone',
    unlockAtCastleLevel: 3,
    levels: commonLevels([
      data({ wood: 140, stone: 0, food: 100 }, minutes(4), 18),
      data({ wood: 200, stone: 0, food: 140 }, minutes(6), 28),
      data({ wood: 270, stone: 20, food: 180 }, minutes(10), 40),
      data({ wood: 360, stone: 40, food: 250 }, minutes(25), 55),
      data({ wood: 520, stone: 80, food: 330 }, hours(1), 75),
      data({ wood: 700, stone: 130, food: 430 }, hours(3), 100),
      data({ wood: 920, stone: 200, food: 560 }, hours(5), 130),
      data({ wood: 1180, stone: 300, food: 720 }, hours(12), 165),
      data({ wood: 1500, stone: 450, food: 920 }, hours(20), 210),
    ]),
  },
  farm: {
    type: 'farm',
    slotId: 'farm_slot',
    producedResource: 'food',
    unlockAtCastleLevel: 1,
    levels: commonLevels([
      data({ wood: 45, stone: 0, food: 35 }, minutes(1), 35),
      data({ wood: 75, stone: 0, food: 50 }, minutes(3), 50),
      data({ wood: 110, stone: 15, food: 75 }, minutes(7), 70),
      data({ wood: 170, stone: 35, food: 110 }, minutes(20), 95),
      data({ wood: 240, stone: 60, food: 160 }, minutes(45), 125),
      data({ wood: 340, stone: 100, food: 230 }, hours(2), 170),
      data({ wood: 470, stone: 160, food: 310 }, hours(4), 225),
      data({ wood: 640, stone: 250, food: 420 }, hours(10), 295),
      data({ wood: 860, stone: 360, food: 560 }, hours(18), 380),
    ]),
  },
  barracks: {
    type: 'barracks',
    slotId: 'barracks_slot',
    producedResource: null,
    unlockAtCastleLevel: 4,
    levels: commonLevels([
      data({ wood: 250, stone: 100, food: 180 }, minutes(10)),
      data({ wood: 320, stone: 140, food: 220 }, minutes(15)),
      data({ wood: 420, stone: 190, food: 280 }, minutes(25)),
      data({ wood: 560, stone: 260, food: 360 }, minutes(45)),
      data({ wood: 740, stone: 360, food: 460 }, hours(1)),
      data({ wood: 980, stone: 500, food: 600 }, hours(3)),
      data({ wood: 1260, stone: 690, food: 780 }, hours(5)),
      data({ wood: 1620, stone: 930, food: 1000 }, hours(10)),
      data({ wood: 2050, stone: 1220, food: 1280 }, hours(18)),
    ]),
  },
  shooting_range: {
    type: 'shooting_range',
    slotId: 'shooting_range_slot',
    producedResource: null,
    unlockAtCastleLevel: 5,
    levels: commonLevels([
      data({ wood: 320, stone: 140, food: 220 }, minutes(25)),
      data({ wood: 410, stone: 180, food: 290 }, minutes(35)),
      data({ wood: 520, stone: 240, food: 360 }, minutes(50)),
      data({ wood: 670, stone: 320, food: 460 }, hours(1)),
      data({ wood: 860, stone: 430, food: 580 }, hours(2)),
      data({ wood: 1090, stone: 580, food: 740 }, hours(4)),
      data({ wood: 1380, stone: 770, food: 930 }, hours(6)),
      data({ wood: 1750, stone: 1020, food: 1180 }, hours(12)),
      data({ wood: 2200, stone: 1320, food: 1470 }, hours(20)),
    ]),
  },
  stable: {
    type: 'stable',
    slotId: 'stable_slot',
    producedResource: null,
    unlockAtCastleLevel: 6,
    levels: commonLevels([
      data({ wood: 420, stone: 200, food: 280 }, minutes(35)),
      data({ wood: 530, stone: 260, food: 360 }, minutes(45)),
      data({ wood: 670, stone: 340, food: 460 }, hours(1)),
      data({ wood: 840, stone: 440, food: 590 }, hours(2)),
      data({ wood: 1050, stone: 570, food: 740 }, hours(3)),
      data({ wood: 1320, stone: 740, food: 930 }, hours(5)),
      data({ wood: 1650, stone: 960, food: 1170 }, hours(8)),
      data({ wood: 2060, stone: 1230, food: 1460 }, hours(14)),
      data({ wood: 2560, stone: 1560, food: 1820 }, hours(24)),
    ]),
  },
  laboratory: {
    type: 'laboratory',
    slotId: 'laboratory_slot',
    producedResource: null,
    unlockAtCastleLevel: 4,
    levels: commonLevels([
      data({ wood: 280, stone: 140, food: 200 }, minutes(12)),
      data({ wood: 360, stone: 190, food: 250 }, minutes(20)),
      data({ wood: 470, stone: 250, food: 320 }, minutes(35)),
      data({ wood: 620, stone: 340, food: 420 }, hours(1)),
      data({ wood: 810, stone: 470, food: 540 }, hours(2)),
      data({ wood: 1050, stone: 640, food: 700 }, hours(4)),
      data({ wood: 1360, stone: 860, food: 900 }, hours(6)),
      data({ wood: 1750, stone: 1140, food: 1150 }, hours(12)),
      data({ wood: 2230, stone: 1480, food: 1460 }, hours(22)),
    ]),
  },
}

export function getVisualStage(level: number): 1 | 2 | 3 | null {
  if (level <= 0) return null
  if (level <= 3) return 1
  if (level <= 6) return 2
  return 3
}
