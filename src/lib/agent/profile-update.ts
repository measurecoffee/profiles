import type { SupabaseClient } from '@supabase/supabase-js'

// Parsed profile update from agent's {{SAVE_PROFILE}} block
interface ProfileUpdate {
  equipment?: Record<string, unknown>
  preferences?: Record<string, unknown>
  location?: Record<string, unknown>
  role?: string
}

/**
 * Parse {{SAVE_PROFILE}}...{{/SAVE_PROFILE}} block from agent response.
 * Returns null if no block found.
 */
export function parseProfileUpdate(message: string): ProfileUpdate | null {
  const match = message.match(/\{\{SAVE_PROFILE\}\}\s*([\s\S]*?)\s*\{\{\/SAVE_PROFILE\}\}/)
  if (!match) return null

  const block = match[1]
  const update: ProfileUpdate = {}

  // Parse key: value lines (value can be JSON or plain string)
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  let currentKey: string | null = null
  let jsonBuffer = ''

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/)

    if (kvMatch) {
      // Flush previous JSON buffer
      if (currentKey && jsonBuffer) {
        try {
          const parsed = JSON.parse(jsonBuffer)
          ;(update as Record<string, unknown>)[currentKey] = parsed
        } catch {
          ;(update as Record<string, unknown>)[currentKey] = jsonBuffer.trim()
        }
        jsonBuffer = ''
      }

      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()

      // Try parsing as JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        jsonBuffer = value
      } else {
        ;(update as Record<string, unknown>)[currentKey] = value
        currentKey = null
      }
    } else if (currentKey) {
      // Continuation of JSON value
      jsonBuffer += '\n' + line
    }
  }

  // Flush last buffer
  if (currentKey && jsonBuffer) {
    try {
      const parsed = JSON.parse(jsonBuffer)
      ;(update as Record<string, unknown>)[currentKey] = parsed
    } catch {
      ;(update as Record<string, unknown>)[currentKey] = jsonBuffer.trim()
    }
  }

  return Object.keys(update).length > 0 ? update : null
}

/**
 * Apply a parsed profile update to the user's deep_context in the database.
 * Uses jsonb_set to merge at the correct paths.
 */
export async function applyProfileUpdate(
  supabase: SupabaseClient,
  userId: string,
  update: ProfileUpdate
): Promise<boolean> {
  // Get current deep_context
  const { data: profile } = await supabase
    .from('profiles')
    .select('deep_context, identity')
    .eq('user_id', userId)
    .single()

  if (!profile) return false

  const deepContext = (profile.deep_context as Record<string, unknown>) || {}

  // Merge each field into deep_context
  if (update.equipment) {
    deepContext.equipment = {
      ...(deepContext.equipment as Record<string, unknown> || {}),
      ...update.equipment,
    }
  }

  if (update.preferences) {
    deepContext.preferences = {
      ...(deepContext.preferences as Record<string, unknown> || {}),
      ...update.preferences,
    }
  }

  if (update.location) {
    deepContext.location = {
      ...(deepContext.location as Record<string, unknown> || {}),
      ...update.location,
    }
  }

  // Also update identity.roles if role changed
  const identityUpdates: Record<string, unknown> = {}
  if (update.role) {
    identityUpdates.roles = [update.role]
  }

  // Write back
  const updatePayload: Record<string, unknown> = {
    deep_context: deepContext,
    updated_at: new Date().toISOString(),
    updated_by: 'agent:onboarding',
  }

  if (Object.keys(identityUpdates).length > 0) {
    const currentIdentity = (profile.identity as Record<string, unknown>) || {}
    updatePayload.identity = { ...currentIdentity, ...identityUpdates }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', userId)

  if (error) {
    console.error('[profile-update] Failed to save:', error.message)
    return false
  }

  return true
}