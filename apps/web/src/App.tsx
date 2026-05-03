import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BASE_SLOTS,
  en,
  formatCompactNumber,
  formatDuration,
  getVisualStage,
  ru,
  type BuildingView,
  type BuildingType,
  type GameState,
} from '@kingdom-trail/shared'

type AuthResponse = {
  token: string
  gameState: GameState
}

type ActionKind = 'build' | 'upgrade' | 'collect' | 'speedup'
type HighlightTarget = 'castle' | 'sawmill' | 'farm' | 'resources'

const TUTORIAL_STEPS: Array<{ id: string; target: HighlightTarget; text: { ru: string; en: string } }> = [
  {
    id: 'castle-intro',
    target: 'castle',
    text: {
      ru: 'Это ваш замок. Его уровень открывает новые здания и развитие базы.',
      en: 'This is your castle. Its level unlocks new buildings and overall base progression.',
    },
  },
  {
    id: 'sawmill-intro',
    target: 'sawmill',
    text: {
      ru: 'Здесь можно построить лесопильню. Она приносит дерево.',
      en: 'You can build a sawmill here. It produces wood.',
    },
  },
  {
    id: 'farm-intro',
    target: 'farm',
    text: {
      ru: 'Ферма производит еду. Эти ресурсы нужны для развития базы.',
      en: 'The farm produces food. You need these resources to grow your base.',
    },
  },
  {
    id: 'resources-intro',
    target: 'resources',
    text: {
      ru: 'Здесь отображаются ваши запасы дерева, камня, еды и алмазов.',
      en: 'Your wood, stone, food, and diamonds are shown here.',
    },
  },
  {
    id: 'collect-intro',
    target: 'sawmill',
    text: {
      ru: 'Нажимайте на производящие здания, чтобы собирать накопленные ресурсы.',
      en: 'Tap resource buildings to collect the resources they have stored.',
    },
  },
  {
    id: 'castle-upgrade',
    target: 'castle',
    text: {
      ru: 'Улучшайте замок, чтобы открывать новые здания и повышать максимальные уровни.',
      en: 'Upgrade the castle to unlock new buildings and raise max levels.',
    },
  },
]

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string
        ready?: () => void
        expand?: () => void
      }
    }
  }
}

const buildingPathMap: Record<BuildingType, string> = {
  castle: '/buildings/castle',
  sawmill: '/buildings/sawmill',
  quarry: '/buildings/quarry',
  farm: '/buildings/farm',
  barracks: '/buildings/barracks',
  shooting_range: '/buildings/shooting-range',
  stable: '/buildings/stable',
  laboratory: '/buildings/laboratory',
}

function getApiBaseUrl() {
  if (window.location.port === '5173') {
    return 'http://localhost:3000'
  }

  return ''
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed')
  }

  return data as T
}

function useConstructionTicker(activeConstruction: GameState['activeConstruction']) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!activeConstruction) {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeConstruction])

  if (!activeConstruction) {
    return null
  }

  const remainingSeconds = Math.max(0, Math.floor((new Date(activeConstruction.endsAt).getTime() - now) / 1000))
  return { ...activeConstruction, remainingSeconds }
}

function getStateLabel(state: BuildingView['state'], language: 'ru' | 'en') {
  const labels = {
    ru: {
      locked: 'Закрыто',
      available: 'Можно строить',
      building: 'Строится',
      built: 'Построено',
    },
    en: {
      locked: 'Locked',
      available: 'Ready to build',
      building: 'Building',
      built: 'Built',
    },
  }

  return labels[language][state]
}

function getNextGoal(gameState: GameState) {
  const buildCandidate = gameState.buildings.find((building) => building.canBuild)
  if (buildCandidate) {
    return {
      buildingType: buildCandidate.buildingType,
      kind: 'build' as const,
    }
  }

  const upgradeCandidate = gameState.buildings.find((building) => building.canUpgrade && building.buildingType !== 'castle')
  if (upgradeCandidate) {
    return {
      buildingType: upgradeCandidate.buildingType,
      kind: 'upgrade' as const,
    }
  }

  return {
    buildingType: 'castle' as BuildingType,
    kind: 'upgrade' as const,
  }
}

export function App() {
  const queryClient = useQueryClient()
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), [])
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.()
    window.Telegram?.WebApp?.expand?.()
  }, [])

  const authQuery = useQuery<AuthResponse>({
    queryKey: ['auth'],
    queryFn: async () => {
      const initData = window.Telegram?.WebApp?.initData
      if (initData) {
        return fetchJson<AuthResponse>(`${apiBaseUrl}/api/auth/telegram`, {
          method: 'POST',
          body: JSON.stringify({ initData }),
        })
      }

      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return fetchJson<AuthResponse>(`${apiBaseUrl}/api/auth/dev`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
      }

      throw new Error('Open the game from the Telegram bot')
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const token = authQuery.data?.token ?? null

  const stateQuery = useQuery<GameState>({
    queryKey: ['game-state', token],
    enabled: Boolean(token),
    queryFn: async () => {
      return fetchJson<GameState>(`${apiBaseUrl}/api/game/state`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    initialData: authQuery.data?.gameState,
    refetchOnWindowFocus: false,
  })

  const actionMutation = useMutation({
    mutationFn: async ({ action, buildingType }: { action: ActionKind; buildingType?: BuildingType }) => {
      const path = action === 'speedup' ? '/api/game/construction/speedup' : `/api/game/${action}`
      return fetchJson<GameState>(`${apiBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: action === 'speedup' ? JSON.stringify({}) : JSON.stringify({ buildingType }),
      })
    },
    onSuccess: (gameState) => {
      setErrorMessage(null)
      queryClient.setQueryData(['game-state', token], gameState)
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed')
    },
  })

  const languageMutation = useMutation({
    mutationFn: async (language: 'ru' | 'en') => {
      return fetchJson<GameState>(`${apiBaseUrl}/api/game/language`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      })
    },
    onSuccess: (gameState) => {
      queryClient.setQueryData(['game-state', token], gameState)
    },
  })

  const tutorialMutation = useMutation({
    mutationFn: async () => {
      return fetchJson<GameState>(`${apiBaseUrl}/api/game/tutorial/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
    },
    onSuccess: (gameState) => {
      queryClient.setQueryData(['game-state', token], gameState)
    },
  })

  const gameState = stateQuery.data
  const construction = useConstructionTicker(gameState?.activeConstruction ?? null)
  const dictionary = gameState?.player.language === 'en' ? en : ru
  const tutorialStep = !gameState?.player.tutorialCompleted ? TUTORIAL_STEPS[tutorialStepIndex] : null

  useEffect(() => {
    if (!construction || construction.remainingSeconds > 0) {
      return
    }

    void stateQuery.refetch()
  }, [construction, stateQuery])

  const selectedBuilding = gameState?.buildings.find((building) => building.buildingType === selectedBuildingType) ?? null
  const castle = gameState?.buildings.find((building) => building.buildingType === 'castle')
  const availableActions = gameState?.buildings.filter((building) => building.canBuild || building.canUpgrade || building.canCollect).length ?? 0
  const nextGoal = gameState ? getNextGoal(gameState) : null

  function getHighlightedState(building: BuildingView | undefined) {
    if (!tutorialStep) {
      return false
    }

    if (tutorialStep.target === 'resources') {
      return false
    }

    return building?.buildingType === tutorialStep.target
  }

  function handleAdvanceTutorial() {
    if (!tutorialStep) {
      return
    }

    if (tutorialStepIndex === TUTORIAL_STEPS.length - 1) {
      tutorialMutation.mutate()
      return
    }

    setTutorialStepIndex((current) => current + 1)
  }

  if (authQuery.isLoading || (token && stateQuery.isLoading)) {
    return <div className="status-screen">Loading Kingdom Trail...</div>
  }

  if (authQuery.isError) {
    return <div className="status-screen">{authQuery.error instanceof Error ? authQuery.error.message : 'Authentication failed'}</div>
  }

  if (!gameState) {
    return <div className="status-screen">Game state is unavailable.</div>
  }

  return (
    <main className="app-shell">
      <div className="top-row">
        <div className={`resource-shell ${tutorialStep?.target === 'resources' ? 'highlighted-target' : ''}`}>
          <ResourceBar gameState={gameState} />
          <button
            className="language-button"
            type="button"
            onClick={() => languageMutation.mutate(gameState.player.language === 'ru' ? 'en' : 'ru')}
          >
            {gameState.player.language.toUpperCase()}
          </button>
        </div>

        <section className="overview-card">
          <div className="overview-copy">
            <span className="eyebrow">{gameState.player.language === 'ru' ? 'Ваше королевство' : 'Your kingdom'}</span>
            <h1>{gameState.player.language === 'ru' ? 'Тропа Королевства' : 'Kingdom Trail'}</h1>
            <p>
              {gameState.player.language === 'ru'
                ? 'Короткая сессия: собрать ресурсы, запустить стройку, усилить замок.'
                : 'A short session loop: collect resources, start a build, strengthen your castle.'}
            </p>
          </div>

          <div className="overview-metrics">
            <div className="metric-card">
              <span>{gameState.player.language === 'ru' ? 'Замок' : 'Castle'}</span>
              <strong>{castle?.level ?? 1}</strong>
            </div>

            <div className="metric-card">
              <span>{gameState.player.language === 'ru' ? 'Действий' : 'Actions'}</span>
              <strong>{availableActions}</strong>
            </div>

            <div className="metric-card metric-card-wide">
              <span>{gameState.player.language === 'ru' ? 'Следующая цель' : 'Next goal'}</span>
              <strong>
                {nextGoal
                  ? `${nextGoal.kind === 'build'
                    ? gameState.player.language === 'ru' ? 'Построить' : 'Build'
                    : gameState.player.language === 'ru' ? 'Улучшить' : 'Upgrade'} ${dictionary.buildings[nextGoal.buildingType].name}`
                  : '-'}
              </strong>
            </div>
          </div>
        </section>

        {construction ? (
          <section className="construction-banner">
            <div>
              <span className="eyebrow">{gameState.player.language === 'ru' ? 'Активная стройка' : 'Active construction'}</span>
              <strong>{dictionary.buildings[construction.buildingType].name} {gameState.player.language === 'ru' ? 'до' : 'to'} {construction.targetLevel}</strong>
            </div>

            <div className="construction-banner-side">
              <strong>{formatDuration(construction.remainingSeconds)}</strong>
              <button type="button" onClick={() => actionMutation.mutate({ action: 'speedup' })}>
                {gameState.player.language === 'ru' ? 'Ускорить' : 'Speed Up'} {gameState.activeConstruction?.speedupCost}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <section className="map-frame">
        <img alt="Kingdom Trail map" className="map-background" src="/background/base-map.jpg" />

        <div className="slot-layer">
          {BASE_SLOTS.map((slot) => {
            const building = gameState.buildings.find((entry) => entry.slotId === slot.slotId)
            const isBuilding = construction?.buildingType === slot.buildingType
            const isHighlighted = getHighlightedState(building)

            return (
              <button
                key={slot.slotId}
                className={`slot ${isHighlighted ? 'highlighted-target' : ''}`}
                style={{
                  left: `${slot.xPercent}%`,
                  top: `${slot.yPercent}%`,
                  width: `${slot.widthPercent}%`,
                  zIndex: slot.zIndex,
                }}
                type="button"
                onClick={() => setSelectedBuildingType(slot.buildingType)}
              >
                {building?.state === 'locked' ? null : building?.state === 'available' ? (
                  <div className="build-sign">
                    <img alt="Build" src="/icons/build-sign.png" />
                    <span>{dictionary.buildings[slot.buildingType].name}</span>
                  </div>
                ) : building ? (
                  <div className="building-stack">
                    {building.visualStage ? (
                      <img
                        alt={dictionary.buildings[slot.buildingType].name}
                        className="building-image"
                        src={`${buildingPathMap[slot.buildingType]}/stage-${getVisualStage(building.level)}.png`}
                      />
                    ) : null}

                    {isBuilding && construction ? (
                      <div className="construction-fog">
                        <div className="construction-cloud" />
                        <div className="construction-timer">{formatDuration(construction.remainingSeconds)}</div>
                      </div>
                    ) : null}

                    {building.canCollect ? <div className="collect-glow" /> : null}

                    <div className="building-badges">
                      <span className="level-badge">Lv {building.level}</span>
                      {building.canCollect ? <span className="ready-badge">{gameState.player.language === 'ru' ? 'Сбор' : 'Ready'}</span> : null}
                    </div>
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      {selectedBuilding ? (
        <div className="modal-backdrop" onClick={() => setSelectedBuildingType(null)}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{dictionary.buildings[selectedBuilding.buildingType].name}</h2>
                <p>{dictionary.buildings[selectedBuilding.buildingType].description}</p>
              </div>

              <button className="ghost-button" type="button" onClick={() => setSelectedBuildingType(null)}>
                {gameState.player.language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>

            <div className="stats-grid">
              <div><span>{gameState.player.language === 'ru' ? 'Уровень' : 'Level'}</span><strong>{selectedBuilding.level}</strong></div>
              <div><span>{gameState.player.language === 'ru' ? 'Состояние' : 'State'}</span><strong>{getStateLabel(selectedBuilding.state, gameState.player.language)}</strong></div>
              <div><span>{gameState.player.language === 'ru' ? 'Накоплено' : 'Stored'}</span><strong>{formatCompactNumber(selectedBuilding.accumulatedResource)}</strong></div>
              <div><span>{gameState.player.language === 'ru' ? 'Время' : 'Next Time'}</span><strong>{selectedBuilding.nextDurationSeconds ? formatDuration(selectedBuilding.nextDurationSeconds) : '-'}</strong></div>
            </div>

            {selectedBuilding.nextCost ? (
              <div className="cost-row">
                <span>{gameState.player.language === 'ru' ? 'Следующая стоимость' : 'Next Cost'}</span>
                <strong>
                  {selectedBuilding.nextCost.wood} {dictionary.resources.wood.toLowerCase()} · {selectedBuilding.nextCost.stone} {dictionary.resources.stone.toLowerCase()} · {selectedBuilding.nextCost.food} {dictionary.resources.food.toLowerCase()}
                </strong>
              </div>
            ) : null}

            <div className="action-row">
              {selectedBuilding.canBuild ? (
                <button type="button" onClick={() => actionMutation.mutate({ action: 'build', buildingType: selectedBuilding.buildingType })}>
                  {dictionary.build}
                </button>
              ) : null}

              {selectedBuilding.canUpgrade ? (
                <button type="button" onClick={() => actionMutation.mutate({ action: 'upgrade', buildingType: selectedBuilding.buildingType })}>
                  {dictionary.upgrade}
                </button>
              ) : null}

              {selectedBuilding.canCollect ? (
                <button type="button" onClick={() => actionMutation.mutate({ action: 'collect', buildingType: selectedBuilding.buildingType })}>
                  {dictionary.collect}
                </button>
              ) : null}

              {construction?.buildingType === selectedBuilding.buildingType ? (
                <button type="button" onClick={() => actionMutation.mutate({ action: 'speedup' })}>
                  {gameState.player.language === 'ru' ? 'Ускорить' : 'Speed Up'} ({gameState.activeConstruction?.speedupCost ?? 0})
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {tutorialStep ? (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <div className="tutorial-progress">{tutorialStepIndex + 1}/{TUTORIAL_STEPS.length}</div>
            <p>{tutorialStep.text[gameState.player.language]}</p>

            <div className="tutorial-actions">
              <button className="ghost-button" type="button" onClick={() => tutorialMutation.mutate()}>
                {gameState.player.language === 'ru' ? 'Пропустить' : 'Skip'}
              </button>

              <button type="button" onClick={handleAdvanceTutorial}>
                {tutorialStepIndex === TUTORIAL_STEPS.length - 1
                  ? gameState.player.language === 'ru' ? 'Завершить' : 'Finish'
                  : gameState.player.language === 'ru' ? 'Далее' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function ResourceBar({ gameState }: { gameState: GameState }) {
  const { resources } = gameState.player

  return (
    <div className="resource-bar">
      <div className="resource-pill"><img alt="Wood" src="/icons/tree.png" /><span>{formatCompactNumber(resources.wood)}</span></div>
      <div className="resource-pill"><img alt="Stone" src="/icons/stone.png" /><span>{formatCompactNumber(resources.stone)}</span></div>
      <div className="resource-pill"><img alt="Food" src="/icons/wheat.png" /><span>{formatCompactNumber(resources.food)}</span></div>
      <div className="resource-pill"><img alt="Diamonds" src="/icons/diamond.png" /><span>{formatCompactNumber(resources.diamonds)}</span></div>
    </div>
  )
}
