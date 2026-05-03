import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_SLOTS, en, formatCompactNumber, formatDuration, getVisualStage, ru, } from '@kingdom-trail/shared';
const TUTORIAL_STEPS = [
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
];
const buildingPathMap = {
    castle: '/buildings/castle',
    sawmill: '/buildings/sawmill',
    quarry: '/buildings/quarry',
    farm: '/buildings/farm',
    barracks: '/buildings/barracks',
    shooting_range: '/buildings/shooting-range',
    stable: '/buildings/stable',
    laboratory: '/buildings/laboratory',
};
function getApiBaseUrl() {
    if (window.location.port === '5173') {
        return 'http://localhost:3000';
    }
    return '';
}
async function fetchJson(url, init) {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.message ?? 'Request failed');
    }
    return data;
}
function useConstructionTicker(activeConstruction) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!activeConstruction) {
            return;
        }
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [activeConstruction]);
    if (!activeConstruction) {
        return null;
    }
    const remainingSeconds = Math.max(0, Math.floor((new Date(activeConstruction.endsAt).getTime() - now) / 1000));
    return { ...activeConstruction, remainingSeconds };
}
function getStateLabel(state, language) {
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
    };
    return labels[language][state];
}
function getNextGoal(gameState) {
    const buildCandidate = gameState.buildings.find((building) => building.canBuild);
    if (buildCandidate) {
        return {
            buildingType: buildCandidate.buildingType,
            kind: 'build',
        };
    }
    const upgradeCandidate = gameState.buildings.find((building) => building.canUpgrade && building.buildingType !== 'castle');
    if (upgradeCandidate) {
        return {
            buildingType: upgradeCandidate.buildingType,
            kind: 'upgrade',
        };
    }
    return {
        buildingType: 'castle',
        kind: 'upgrade',
    };
}
export function App() {
    const queryClient = useQueryClient();
    const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
    const [selectedBuildingType, setSelectedBuildingType] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
    useEffect(() => {
        window.Telegram?.WebApp?.ready?.();
        window.Telegram?.WebApp?.expand?.();
    }, []);
    const authQuery = useQuery({
        queryKey: ['auth'],
        queryFn: async () => {
            const initData = window.Telegram?.WebApp?.initData;
            if (initData) {
                return fetchJson(`${apiBaseUrl}/api/auth/telegram`, {
                    method: 'POST',
                    body: JSON.stringify({ initData }),
                });
            }
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return fetchJson(`${apiBaseUrl}/api/auth/dev`, {
                    method: 'POST',
                    body: JSON.stringify({}),
                });
            }
            throw new Error('Open the game from the Telegram bot');
        },
        retry: false,
        refetchOnWindowFocus: false,
    });
    const token = authQuery.data?.token ?? null;
    const stateQuery = useQuery({
        queryKey: ['game-state', token],
        enabled: Boolean(token),
        queryFn: async () => {
            return fetchJson(`${apiBaseUrl}/api/game/state`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        },
        initialData: authQuery.data?.gameState,
        refetchOnWindowFocus: false,
    });
    const actionMutation = useMutation({
        mutationFn: async ({ action, buildingType }) => {
            const path = action === 'speedup' ? '/api/game/construction/speedup' : `/api/game/${action}`;
            return fetchJson(`${apiBaseUrl}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: action === 'speedup' ? JSON.stringify({}) : JSON.stringify({ buildingType }),
            });
        },
        onSuccess: (gameState) => {
            setErrorMessage(null);
            queryClient.setQueryData(['game-state', token], gameState);
        },
        onError: (error) => {
            setErrorMessage(error instanceof Error ? error.message : 'Action failed');
        },
    });
    const languageMutation = useMutation({
        mutationFn: async (language) => {
            return fetchJson(`${apiBaseUrl}/api/game/language`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ language }),
            });
        },
        onSuccess: (gameState) => {
            queryClient.setQueryData(['game-state', token], gameState);
        },
    });
    const tutorialMutation = useMutation({
        mutationFn: async () => {
            return fetchJson(`${apiBaseUrl}/api/game/tutorial/complete`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            });
        },
        onSuccess: (gameState) => {
            queryClient.setQueryData(['game-state', token], gameState);
        },
    });
    const gameState = stateQuery.data;
    const construction = useConstructionTicker(gameState?.activeConstruction ?? null);
    const dictionary = gameState?.player.language === 'en' ? en : ru;
    const tutorialStep = !gameState?.player.tutorialCompleted ? TUTORIAL_STEPS[tutorialStepIndex] : null;
    useEffect(() => {
        if (!construction || construction.remainingSeconds > 0) {
            return;
        }
        void stateQuery.refetch();
    }, [construction, stateQuery]);
    const selectedBuilding = gameState?.buildings.find((building) => building.buildingType === selectedBuildingType) ?? null;
    const castle = gameState?.buildings.find((building) => building.buildingType === 'castle');
    const availableActions = gameState?.buildings.filter((building) => building.canBuild || building.canUpgrade || building.canCollect).length ?? 0;
    const nextGoal = gameState ? getNextGoal(gameState) : null;
    function getHighlightedState(building) {
        if (!tutorialStep) {
            return false;
        }
        if (tutorialStep.target === 'resources') {
            return false;
        }
        return building?.buildingType === tutorialStep.target;
    }
    function handleAdvanceTutorial() {
        if (!tutorialStep) {
            return;
        }
        if (tutorialStepIndex === TUTORIAL_STEPS.length - 1) {
            tutorialMutation.mutate();
            return;
        }
        setTutorialStepIndex((current) => current + 1);
    }
    if (authQuery.isLoading || (token && stateQuery.isLoading)) {
        return _jsx("div", { className: "status-screen", children: "Loading Kingdom Trail..." });
    }
    if (authQuery.isError) {
        return _jsx("div", { className: "status-screen", children: authQuery.error instanceof Error ? authQuery.error.message : 'Authentication failed' });
    }
    if (!gameState) {
        return _jsx("div", { className: "status-screen", children: "Game state is unavailable." });
    }
    return (_jsxs("main", { className: "app-shell", children: [_jsxs("div", { className: "top-row", children: [_jsxs("div", { className: `resource-shell ${tutorialStep?.target === 'resources' ? 'highlighted-target' : ''}`, children: [_jsx(ResourceBar, { gameState: gameState }), _jsx("button", { className: "language-button", type: "button", onClick: () => languageMutation.mutate(gameState.player.language === 'ru' ? 'en' : 'ru'), children: gameState.player.language.toUpperCase() })] }), _jsxs("section", { className: "overview-card", children: [_jsxs("div", { className: "overview-copy", children: [_jsx("span", { className: "eyebrow", children: gameState.player.language === 'ru' ? 'Ваше королевство' : 'Your kingdom' }), _jsx("h1", { children: gameState.player.language === 'ru' ? 'Тропа Королевства' : 'Kingdom Trail' }), _jsx("p", { children: gameState.player.language === 'ru'
                                            ? 'Короткая сессия: собрать ресурсы, запустить стройку, усилить замок.'
                                            : 'A short session loop: collect resources, start a build, strengthen your castle.' })] }), _jsxs("div", { className: "overview-metrics", children: [_jsxs("div", { className: "metric-card", children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Замок' : 'Castle' }), _jsx("strong", { children: castle?.level ?? 1 })] }), _jsxs("div", { className: "metric-card", children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Действий' : 'Actions' }), _jsx("strong", { children: availableActions })] }), _jsxs("div", { className: "metric-card metric-card-wide", children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Следующая цель' : 'Next goal' }), _jsx("strong", { children: nextGoal
                                                    ? `${nextGoal.kind === 'build'
                                                        ? gameState.player.language === 'ru' ? 'Построить' : 'Build'
                                                        : gameState.player.language === 'ru' ? 'Улучшить' : 'Upgrade'} ${dictionary.buildings[nextGoal.buildingType].name}`
                                                    : '-' })] })] })] }), construction ? (_jsxs("section", { className: "construction-banner", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: gameState.player.language === 'ru' ? 'Активная стройка' : 'Active construction' }), _jsxs("strong", { children: [dictionary.buildings[construction.buildingType].name, " ", gameState.player.language === 'ru' ? 'до' : 'to', " ", construction.targetLevel] })] }), _jsxs("div", { className: "construction-banner-side", children: [_jsx("strong", { children: formatDuration(construction.remainingSeconds) }), _jsxs("button", { type: "button", onClick: () => actionMutation.mutate({ action: 'speedup' }), children: [gameState.player.language === 'ru' ? 'Ускорить' : 'Speed Up', " ", gameState.activeConstruction?.speedupCost] })] })] })) : null] }), _jsxs("section", { className: "map-frame", children: [_jsx("img", { alt: "Kingdom Trail map", className: "map-background", src: "/background/base-map.jpg" }), _jsx("div", { className: "slot-layer", children: BASE_SLOTS.map((slot) => {
                            const building = gameState.buildings.find((entry) => entry.slotId === slot.slotId);
                            const isBuilding = construction?.buildingType === slot.buildingType;
                            const isHighlighted = getHighlightedState(building);
                            return (_jsx("button", { className: `slot ${isHighlighted ? 'highlighted-target' : ''}`, style: {
                                    left: `${slot.xPercent}%`,
                                    top: `${slot.yPercent}%`,
                                    width: `${slot.widthPercent}%`,
                                    zIndex: slot.zIndex,
                                }, type: "button", onClick: () => setSelectedBuildingType(slot.buildingType), children: building?.state === 'locked' ? null : building?.state === 'available' ? (_jsxs("div", { className: "build-sign", children: [_jsx("img", { alt: "Build", src: "/icons/build-sign.png" }), _jsx("span", { children: dictionary.buildings[slot.buildingType].name })] })) : building ? (_jsxs("div", { className: "building-stack", children: [building.visualStage ? (_jsx("img", { alt: dictionary.buildings[slot.buildingType].name, className: "building-image", src: `${buildingPathMap[slot.buildingType]}/stage-${getVisualStage(building.level)}.png` })) : null, isBuilding && construction ? (_jsxs("div", { className: "construction-fog", children: [_jsx("div", { className: "construction-cloud" }), _jsx("div", { className: "construction-timer", children: formatDuration(construction.remainingSeconds) })] })) : null, building.canCollect ? _jsx("div", { className: "collect-glow" }) : null, _jsxs("div", { className: "building-badges", children: [_jsxs("span", { className: "level-badge", children: ["Lv ", building.level] }), building.canCollect ? _jsx("span", { className: "ready-badge", children: gameState.player.language === 'ru' ? 'Сбор' : 'Ready' }) : null] })] })) : null }, slot.slotId));
                        }) })] }), errorMessage ? _jsx("div", { className: "error-banner", children: errorMessage }) : null, selectedBuilding ? (_jsx("div", { className: "modal-backdrop", onClick: () => setSelectedBuildingType(null), children: _jsxs("section", { className: "modal-card", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsxs("div", { children: [_jsx("h2", { children: dictionary.buildings[selectedBuilding.buildingType].name }), _jsx("p", { children: dictionary.buildings[selectedBuilding.buildingType].description })] }), _jsx("button", { className: "ghost-button", type: "button", onClick: () => setSelectedBuildingType(null), children: gameState.player.language === 'ru' ? 'Закрыть' : 'Close' })] }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Уровень' : 'Level' }), _jsx("strong", { children: selectedBuilding.level })] }), _jsxs("div", { children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Состояние' : 'State' }), _jsx("strong", { children: getStateLabel(selectedBuilding.state, gameState.player.language) })] }), _jsxs("div", { children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Накоплено' : 'Stored' }), _jsx("strong", { children: formatCompactNumber(selectedBuilding.accumulatedResource) })] }), _jsxs("div", { children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Время' : 'Next Time' }), _jsx("strong", { children: selectedBuilding.nextDurationSeconds ? formatDuration(selectedBuilding.nextDurationSeconds) : '-' })] })] }), selectedBuilding.nextCost ? (_jsxs("div", { className: "cost-row", children: [_jsx("span", { children: gameState.player.language === 'ru' ? 'Следующая стоимость' : 'Next Cost' }), _jsxs("strong", { children: [selectedBuilding.nextCost.wood, " ", dictionary.resources.wood.toLowerCase(), " \u00B7 ", selectedBuilding.nextCost.stone, " ", dictionary.resources.stone.toLowerCase(), " \u00B7 ", selectedBuilding.nextCost.food, " ", dictionary.resources.food.toLowerCase()] })] })) : null, _jsxs("div", { className: "action-row", children: [selectedBuilding.canBuild ? (_jsx("button", { type: "button", onClick: () => actionMutation.mutate({ action: 'build', buildingType: selectedBuilding.buildingType }), children: dictionary.build })) : null, selectedBuilding.canUpgrade ? (_jsx("button", { type: "button", onClick: () => actionMutation.mutate({ action: 'upgrade', buildingType: selectedBuilding.buildingType }), children: dictionary.upgrade })) : null, selectedBuilding.canCollect ? (_jsx("button", { type: "button", onClick: () => actionMutation.mutate({ action: 'collect', buildingType: selectedBuilding.buildingType }), children: dictionary.collect })) : null, construction?.buildingType === selectedBuilding.buildingType ? (_jsxs("button", { type: "button", onClick: () => actionMutation.mutate({ action: 'speedup' }), children: [gameState.player.language === 'ru' ? 'Ускорить' : 'Speed Up', " (", gameState.activeConstruction?.speedupCost ?? 0, ")"] })) : null] })] }) })) : null, tutorialStep ? (_jsx("div", { className: "tutorial-overlay", children: _jsxs("div", { className: "tutorial-card", children: [_jsxs("div", { className: "tutorial-progress", children: [tutorialStepIndex + 1, "/", TUTORIAL_STEPS.length] }), _jsx("p", { children: tutorialStep.text[gameState.player.language] }), _jsxs("div", { className: "tutorial-actions", children: [_jsx("button", { className: "ghost-button", type: "button", onClick: () => tutorialMutation.mutate(), children: gameState.player.language === 'ru' ? 'Пропустить' : 'Skip' }), _jsx("button", { type: "button", onClick: handleAdvanceTutorial, children: tutorialStepIndex === TUTORIAL_STEPS.length - 1
                                        ? gameState.player.language === 'ru' ? 'Завершить' : 'Finish'
                                        : gameState.player.language === 'ru' ? 'Далее' : 'Next' })] })] }) })) : null] }));
}
function ResourceBar({ gameState }) {
    const { resources } = gameState.player;
    return (_jsxs("div", { className: "resource-bar", children: [_jsxs("div", { className: "resource-pill", children: [_jsx("img", { alt: "Wood", src: "/icons/tree.png" }), _jsx("span", { children: formatCompactNumber(resources.wood) })] }), _jsxs("div", { className: "resource-pill", children: [_jsx("img", { alt: "Stone", src: "/icons/stone.png" }), _jsx("span", { children: formatCompactNumber(resources.stone) })] }), _jsxs("div", { className: "resource-pill", children: [_jsx("img", { alt: "Food", src: "/icons/wheat.png" }), _jsx("span", { children: formatCompactNumber(resources.food) })] }), _jsxs("div", { className: "resource-pill", children: [_jsx("img", { alt: "Diamonds", src: "/icons/diamond.png" }), _jsx("span", { children: formatCompactNumber(resources.diamonds) })] })] }));
}
//# sourceMappingURL=App.js.map