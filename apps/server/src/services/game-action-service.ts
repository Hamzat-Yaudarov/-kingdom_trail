import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  CASTLE_REQUIREMENTS,
  type BuildingType,
  type ConstructionQueueRow,
  type PlayerBuildingRow,
  type PlayerResources,
  type PlayerRow,
} from '@kingdom-trail/shared'
import { supabaseAdmin } from '../lib/supabase.js'
import { buildGameState, getResourceAccumulation, getSpeedupCost } from './game-state-service.js'

export class ActionError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
  }
}

type PlayerContext = {
  player: PlayerRow
  buildings: PlayerBuildingRow[]
  activeConstruction: ConstructionQueueRow | null
}

function assertBuildingType(buildingType: string): asserts buildingType is BuildingType {
  if (!BUILDING_TYPES.includes(buildingType as BuildingType)) {
    throw new ActionError('Unknown building type', 400)
  }
}

function hasEnoughResources(resources: PlayerResources, cost: { wood: number; stone: number; food: number; diamonds?: number }) {
  return resources.wood >= cost.wood
    && resources.stone >= cost.stone
    && resources.food >= cost.food
    && resources.diamonds >= (cost.diamonds ?? 0)
}

function subtractResources(resources: PlayerResources, cost: { wood: number; stone: number; food: number; diamonds?: number }): PlayerResources {
  return {
    wood: resources.wood - cost.wood,
    stone: resources.stone - cost.stone,
    food: resources.food - cost.food,
    diamonds: resources.diamonds - (cost.diamonds ?? 0),
  }
}

function requirementsMetForCastle(nextLevel: number, buildingsByType: Map<BuildingType, PlayerBuildingRow>) {
  const requirements = CASTLE_REQUIREMENTS[nextLevel]
  if (!requirements) {
    return true
  }

  return Object.entries(requirements).every(([buildingType, level]) => {
    return (buildingsByType.get(buildingType as BuildingType)?.level ?? 0) >= (level ?? 0)
  })
}

async function loadContext(playerId: string): Promise<PlayerContext> {
  await buildGameState(playerId)

  const [{ data: player, error: playerError }, { data: buildings, error: buildingsError }, { data: activeConstruction, error: constructionError }] = await Promise.all([
    supabaseAdmin.from('players').select('*').eq('id', playerId).single<PlayerRow>(),
    supabaseAdmin.from('player_buildings').select('*').eq('player_id', playerId).returns<PlayerBuildingRow[]>(),
    supabaseAdmin
      .from('construction_queue')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'active')
      .maybeSingle<ConstructionQueueRow>(),
  ])

  if (playerError || !player) {
    throw new ActionError('Player not found', 404)
  }

  if (buildingsError || !buildings) {
    throw new ActionError('Buildings not found', 500)
  }

  if (constructionError) {
    throw new ActionError('Failed to load construction queue', 500)
  }

  return {
    player,
    buildings,
    activeConstruction: activeConstruction ?? null,
  }
}

async function persistResources(playerId: string, resources: PlayerResources) {
  const { error } = await supabaseAdmin
    .from('players')
    .update({
      wood: resources.wood,
      stone: resources.stone,
      food: resources.food,
      diamonds: resources.diamonds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId)

  if (error) {
    throw new ActionError('Failed to update player resources', 500)
  }
}

async function createConstruction(playerId: string, buildingType: BuildingType, targetLevel: number, durationSeconds: number) {
  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + durationSeconds * 1000)

  const { error } = await supabaseAdmin.from('construction_queue').insert({
    player_id: playerId,
    building_type: buildingType,
    target_level: targetLevel,
    started_at: startedAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'active',
  })

  if (error) {
    throw new ActionError('Failed to start construction', 500)
  }
}

export async function buildBuilding(playerId: string, requestedBuildingType: string) {
  assertBuildingType(requestedBuildingType)

  const { player, buildings, activeConstruction } = await loadContext(playerId)
  const building = buildings.find((entry) => entry.building_type === requestedBuildingType)
  const castleLevel = buildings.find((entry) => entry.building_type === 'castle')?.level ?? 1

  if (!building) {
    throw new ActionError('Building row is missing', 500)
  }

  if (building.is_built) {
    throw new ActionError('Building is already constructed', 409)
  }

  if (activeConstruction) {
    throw new ActionError('Another construction is already active', 409)
  }

  const config = BUILDING_CONFIG[requestedBuildingType]
  if (castleLevel < config.unlockAtCastleLevel) {
    throw new ActionError('Building is not unlocked yet', 400)
  }

  const levelData = config.levels[1]
  const currentResources: PlayerResources = {
    wood: player.wood,
    stone: player.stone,
    food: player.food,
    diamonds: player.diamonds,
  }

  if (!hasEnoughResources(currentResources, levelData.cost)) {
    throw new ActionError('Not enough resources', 400)
  }

  await persistResources(playerId, subtractResources(currentResources, levelData.cost))
  await createConstruction(playerId, requestedBuildingType, 1, levelData.durationSeconds)

  return buildGameState(playerId)
}

export async function upgradeBuilding(playerId: string, requestedBuildingType: string) {
  assertBuildingType(requestedBuildingType)

  const { player, buildings, activeConstruction } = await loadContext(playerId)
  const building = buildings.find((entry) => entry.building_type === requestedBuildingType)
  const buildingsByType = new Map(buildings.map((entry) => [entry.building_type, entry]))
  const castleLevel = buildingsByType.get('castle')?.level ?? 1

  if (!building) {
    throw new ActionError('Building row is missing', 500)
  }

  if (!building.is_built) {
    throw new ActionError('Building is not constructed yet', 400)
  }

  if (activeConstruction) {
    throw new ActionError('Another construction is already active', 409)
  }

  const nextLevel = building.level + 1
  if (nextLevel > 9) {
    throw new ActionError('Building is already at max level', 400)
  }

  if (requestedBuildingType !== 'castle' && nextLevel > castleLevel) {
    throw new ActionError('Upgrade is blocked by castle level', 400)
  }

  if (requestedBuildingType === 'castle' && !requirementsMetForCastle(nextLevel, buildingsByType)) {
    throw new ActionError('Castle requirements are not met', 400)
  }

  const levelData = BUILDING_CONFIG[requestedBuildingType].levels[nextLevel]
  const currentResources: PlayerResources = {
    wood: player.wood,
    stone: player.stone,
    food: player.food,
    diamonds: player.diamonds,
  }

  if (!levelData || !hasEnoughResources(currentResources, levelData.cost)) {
    throw new ActionError('Not enough resources', 400)
  }

  await persistResources(playerId, subtractResources(currentResources, levelData.cost))
  await createConstruction(playerId, requestedBuildingType, nextLevel, levelData.durationSeconds)

  return buildGameState(playerId)
}

export async function collectBuildingResources(playerId: string, requestedBuildingType: string) {
  assertBuildingType(requestedBuildingType)

  const { player, buildings } = await loadContext(playerId)
  const building = buildings.find((entry) => entry.building_type === requestedBuildingType)

  if (!building) {
    throw new ActionError('Building row is missing', 500)
  }

  const config = BUILDING_CONFIG[requestedBuildingType]
  if (!building.is_built || !config.producedResource) {
    throw new ActionError('This building cannot produce resources', 400)
  }

  const amount = getResourceAccumulation(building)
  if (amount <= 0) {
    throw new ActionError('Nothing to collect yet', 400)
  }

  const nextResources: PlayerResources = {
    wood: player.wood,
    stone: player.stone,
    food: player.food,
    diamonds: player.diamonds,
  }

  if (config.producedResource === 'wood') nextResources.wood += amount
  if (config.producedResource === 'stone') nextResources.stone += amount
  if (config.producedResource === 'food') nextResources.food += amount

  await persistResources(playerId, nextResources)

  const { error } = await supabaseAdmin
    .from('player_buildings')
    .update({ last_collected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('building_type', requestedBuildingType)

  if (error) {
    throw new ActionError('Failed to update building collection time', 500)
  }

  return buildGameState(playerId)
}

export async function speedupConstruction(playerId: string) {
  const { player, activeConstruction } = await loadContext(playerId)

  if (!activeConstruction) {
    throw new ActionError('No active construction to speed up', 400)
  }

  const remainingSeconds = Math.max(0, Math.floor((new Date(activeConstruction.ends_at).getTime() - Date.now()) / 1000))
  const speedupCost = getSpeedupCost(remainingSeconds)
  const currentResources: PlayerResources = {
    wood: player.wood,
    stone: player.stone,
    food: player.food,
    diamonds: player.diamonds,
  }

  if (!hasEnoughResources(currentResources, { wood: 0, stone: 0, food: 0, diamonds: speedupCost })) {
    throw new ActionError('Not enough diamonds', 400)
  }

  await persistResources(playerId, subtractResources(currentResources, { wood: 0, stone: 0, food: 0, diamonds: speedupCost }))

  const { error } = await supabaseAdmin
    .from('construction_queue')
    .update({
      ends_at: new Date().toISOString(),
      speedup_spent_diamonds: activeConstruction.speedup_spent_diamonds + speedupCost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activeConstruction.id)

  if (error) {
    throw new ActionError('Failed to speed up construction', 500)
  }

  return buildGameState(playerId)
}
