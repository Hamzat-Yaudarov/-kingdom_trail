export const RESOURCE_TYPES = ['wood', 'stone', 'food', 'diamonds'] as const

export type ResourceType = (typeof RESOURCE_TYPES)[number]

export type CraftResourceType = Exclude<ResourceType, 'diamonds'>

export type ResourceCosts = Record<CraftResourceType, number>
