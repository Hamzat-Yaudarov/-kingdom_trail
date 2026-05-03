import type { GameState, Language } from './game-state.js'

export type TelegramAuthRequest = {
  initData: string
}

export type TelegramAuthResponse = {
  token: string
  gameState: GameState
}

export type LanguageRequest = {
  language: Language
}

export type BuildingActionRequest = {
  buildingType: string
}
