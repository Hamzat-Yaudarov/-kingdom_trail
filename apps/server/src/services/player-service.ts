import { BASE_SLOTS, STARTING_RESOURCES, type Language, type PlayerBuildingRow, type PlayerRow } from '@kingdom-trail/shared'
import { supabaseAdmin } from '../lib/supabase.js'
import type { TelegramInitUser } from '../lib/telegram.js'

function detectLanguage(languageCode?: string): Language {
  return languageCode?.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export async function ensurePlayerForTelegramUser(user: TelegramInitUser) {
  const now = new Date().toISOString()
  const language = detectLanguage(user.language_code)

  const { data: player, error: playerError } = await supabaseAdmin
    .from('players')
    .upsert(
      {
        telegram_id: String(user.id),
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        language,
        last_login_at: now,
      },
      { onConflict: 'telegram_id' },
    )
    .select('*')
    .single<PlayerRow>()

  if (playerError || !player) {
    throw playerError ?? new Error('Failed to upsert player')
  }

  const starterBuildings: Omit<PlayerBuildingRow, 'id' | 'created_at' | 'updated_at'>[] = BASE_SLOTS.map((slot) => ({
    player_id: player.id,
    building_type: slot.buildingType,
    level: slot.buildingType === 'castle' ? 1 : 0,
    is_built: slot.buildingType === 'castle',
    slot_id: slot.slotId,
    last_collected_at: null,
  }))

  const { error: buildingError } = await supabaseAdmin
    .from('player_buildings')
    .upsert(starterBuildings, { onConflict: 'player_id,building_type', ignoreDuplicates: true })

  if (buildingError) {
    throw buildingError
  }

  return {
    ...player,
    wood: player.wood ?? STARTING_RESOURCES.wood,
    stone: player.stone ?? STARTING_RESOURCES.stone,
    food: player.food ?? STARTING_RESOURCES.food,
    diamonds: player.diamonds ?? STARTING_RESOURCES.diamonds,
  }
}
