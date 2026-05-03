import type { ResourceCosts } from './resource-types'

export const MAX_BUILDING_LEVEL = 9
export const RESOURCE_CAP_HOURS = 8

export const STARTING_RESOURCES = {
  wood: 200,
  stone: 50,
  food: 200,
  diamonds: 75,
} as const

export const ZERO_COSTS: ResourceCosts = {
  wood: 0,
  stone: 0,
  food: 0,
}

export function minutes(value: number) {
  return value * 60
}

export function hours(value: number) {
  return value * 60 * 60
}
