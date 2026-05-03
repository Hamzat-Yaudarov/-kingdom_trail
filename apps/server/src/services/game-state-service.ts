import {
  BASE_SLOTS,
  BUILDING_CONFIG,
  CASTLE_REQUIREMENTS,
  RESOURCE_CAP_HOURS,
  RESOURCE_BUILDINGS,
  getVisualStage,
  type ActiveConstruction,
  type BuildingType,
  type BuildingView,
  type ConstructionQueueRow,
  type GameState,
  type PlayerBuildingRow,
  type PlayerResources,
  type PlayerRow,
} from '@kingdom-trail/shared'
import { supabaseAdmin } from '../lib/supabase.js'

const ZERO_PLAYER_RESOURCES: PlayerResources = {
  wood: 0,
  stone: 0,
  food: 0,
  diamonds: 0,
}

function withDiamonds(cost: { wood: number; stone: number; food: number }): PlayerResources {
  return { ...cost, diamonds: 0 }
}

export function getResourceAccumulation(building: PlayerBuildingRow) {
  const config = BUILDING_CONFIG[building.building_type]
  if (!building.is_built || !config.producedResource || building.level <= 0) {
    return 0
  }

  const levelData = config.levels[building.level]
  if (!levelData) {
    return 0
  }

  const from = building.last_collected_at ?? building.updated_at
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000))
  const cappedSeconds = Math.min(elapsedSeconds, RESOURCE_CAP_HOURS * 3600)

  return Math.floor((levelData.productionPerHour * cappedSeconds) / 3600)
}

export function getSpeedupCost(remainingSeconds: number) {
  if (remainingSeconds <= 5 * 60) return 2
  if (remainingSeconds <= 30 * 60) return 8
  if (remainingSeconds <= 2 * 60 * 60) return 20
  if (remainingSeconds <= 8 * 60 * 60) return 45
  return 85
}

function hasEnoughResources(resources: PlayerResources, cost: PlayerResources) {
  return resources.wood >= cost.wood
    && resources.stone >= cost.stone
    && resources.food >= cost.food
    && resources.diamonds >= cost.diamonds
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

async function completeExpiredConstruction(activeConstruction: ConstructionQueueRow | null) {
  if (!activeConstruction) {
    return null
  }

  const endsAt = new Date(activeConstruction.ends_at).getTime()
  if (endsAt > Date.now()) {
    return activeConstruction
  }

  const now = new Date().toISOString()
  const isResourceBuilding = RESOURCE_BUILDINGS.includes(activeConstruction.building_type)

  const { error: buildingError } = await supabaseAdmin
    .from('player_buildings')
    .update({
      level: activeConstruction.target_level,
      is_built: true,
      updated_at: now,
      ...(isResourceBuilding ? { last_collected_at: now } : {}),
    })
    .eq('player_id', activeConstruction.player_id)
    .eq('building_type', activeConstruction.building_type)

  if (buildingError) {
    throw buildingError
  }

  const { error: queueError } = await supabaseAdmin
    .from('construction_queue')
    .update({ status: 'completed', updated_at: now })
    .eq('id', activeConstruction.id)

  if (queueError) {
    throw queueError
  }

  return null
}

export async function buildGameState(playerId: string): Promise<GameState> {
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
    throw playerError ?? new Error('Player not found')
  }

  if (buildingsError || !buildings) {
    throw buildingsError ?? new Error('Buildings not found')
  }

  if (constructionError) {
    throw constructionError
  }

  const currentConstruction = await completeExpiredConstruction(activeConstruction ?? null)

  if (activeConstruction && !currentConstruction) {
    return buildGameState(playerId)
  }

  const buildingsByType = new Map(buildings.map((building) => [building.building_type, building]))
  const castleLevel = buildingsByType.get('castle')?.level ?? 1
  const playerResources: PlayerResources = {
    wood: player.wood,
    stone: player.stone,
    food: player.food,
    diamonds: player.diamonds,
  }

  const buildingViews: BuildingView[] = BASE_SLOTS.map((slot) => {
    const building = buildingsByType.get(slot.buildingType)
    const level = building?.level ?? 0
    const isBuilt = building?.is_built ?? false
    const unlockAtCastleLevel = BUILDING_CONFIG[slot.buildingType].unlockAtCastleLevel
    const isUnderConstruction = currentConstruction?.building_type === slot.buildingType
    const state = isUnderConstruction
      ? 'building'
      : isBuilt
        ? 'built'
        : castleLevel >= unlockAtCastleLevel
          ? 'available'
          : 'locked'
    const nextLevel = isBuilt ? level + 1 : 1
    const nextLevelData = BUILDING_CONFIG[slot.buildingType].levels[nextLevel] ?? null
    const accumulatedResource = building ? getResourceAccumulation(building) : 0

    const canUpgrade = isBuilt
      && !currentConstruction
      && !isUnderConstruction
      && level < 9
      && nextLevel <= castleLevel + (slot.buildingType === 'castle' ? 1 : 0)
      && (slot.buildingType !== 'castle' || requirementsMetForCastle(nextLevel, buildingsByType))
      && Boolean(nextLevelData)
      && hasEnoughResources(playerResources, nextLevelData ? withDiamonds(nextLevelData.cost) : ZERO_PLAYER_RESOURCES)

    const canBuild = !isBuilt
      && state === 'available'
      && !currentConstruction
      && Boolean(nextLevelData)
      && hasEnoughResources(playerResources, nextLevelData ? withDiamonds(nextLevelData.cost) : ZERO_PLAYER_RESOURCES)

    return {
      buildingType: slot.buildingType,
      slotId: slot.slotId,
      level,
      isBuilt,
      state,
      canBuild,
      canUpgrade,
      canCollect: accumulatedResource > 0,
      accumulatedResource,
      producedResource: BUILDING_CONFIG[slot.buildingType].producedResource,
      nextCost: nextLevelData ? withDiamonds(nextLevelData.cost) : null,
      nextDurationSeconds: nextLevelData?.durationSeconds ?? null,
      unlockAtCastleLevel,
      visualStage: getVisualStage(level),
    }
  })

  const constructionView: ActiveConstruction | null = currentConstruction
    ? {
        buildingType: currentConstruction.building_type,
        targetLevel: currentConstruction.target_level,
        startedAt: currentConstruction.started_at,
        endsAt: currentConstruction.ends_at,
        remainingSeconds: Math.max(0, Math.floor((new Date(currentConstruction.ends_at).getTime() - Date.now()) / 1000)),
        speedupCost: getSpeedupCost(Math.max(0, Math.floor((new Date(currentConstruction.ends_at).getTime() - Date.now()) / 1000))),
      }
    : null

  return {
    player: {
      id: player.id,
      firstName: player.first_name,
      username: player.username,
      language: player.language,
      tutorialCompleted: player.tutorial_completed,
      resources: playerResources,
    },
    buildings: buildingViews,
    activeConstruction: constructionView,
  }
}
