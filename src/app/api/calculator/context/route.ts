import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  type CalculatorContextPayload,
  sanitizeCalculatorContext,
} from '@/lib/calculator/context'
import { activeContextToJson } from '@/lib/profile/active-context'
import type { Json } from '@/types/supabase'

type LooseRelation = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: Array<{
    foreignKeyName: string
    columns: string[]
    isOneToOne: boolean
    referencedRelation: string
    referencedColumns: string[]
  }>
}

type LooseSchema = {
  Tables: Record<string, LooseRelation>
  Views: Record<string, never>
  Functions: Record<string, never>
  Enums: Record<string, never>
  CompositeTypes: Record<string, never>
}

type LooseDatabase = {
  __InternalSupabase: {
    PostgrestVersion: string
  }
  public: LooseSchema
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function getBoundedNumber(
  values: Record<string, number>,
  key: string,
  min: number,
  max: number
): number | null {
  const raw = values[key]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw < min || raw > max) return null
  return Number(raw.toFixed(4))
}

function getOutputNumber(
  values: Record<string, number | string>,
  key: string,
  min: number,
  max: number
): number | null {
  const raw = values[key]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw < min || raw > max) return null
  return Number(raw.toFixed(4))
}

function getOptionalUuid(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function buildPreferencePatch(
  context: CalculatorContextPayload,
  savedAt: string
): Record<string, unknown> | null {
  switch (context.calculator) {
    case 'brew_ratio': {
      const coffeeDose = getBoundedNumber(context.inputs, 'coffee_dose_g', 1, 300)
      const ratio = getBoundedNumber(context.inputs, 'ratio', 1, 40)
      const cups = getBoundedNumber(context.inputs, 'cups', 0.25, 24)
      const totalWater = getOutputNumber(context.outputs, 'total_water_g', 1, 12_000)
      const totalYield = getOutputNumber(context.outputs, 'total_yield_ml', 1, 12_000)
      const perCupYield = getOutputNumber(context.outputs, 'per_cup_yield_ml', 0, 4_000)

      if (!coffeeDose || !ratio || !cups || !totalWater || !totalYield || perCupYield === null) {
        return null
      }

      return {
        brew_ratio_targets: {
          coffee_dose_g: coffeeDose,
          ratio,
          cups,
          total_water_g: totalWater,
          total_yield_ml: totalYield,
          per_cup_yield_ml: perCupYield,
          last_saved_at: savedAt,
        },
      }
    }
    case 'extraction_yield': {
      const dose = getBoundedNumber(context.inputs, 'dose_g', 1, 300)
      const yieldWeight = getBoundedNumber(context.inputs, 'yield_g', 1, 12_000)
      const tds = getBoundedNumber(context.inputs, 'tds_percent', 0.1, 30)
      const extractionYield = getOutputNumber(
        context.outputs,
        'extraction_yield_percent',
        0.1,
        40
      )

      if (!dose || !yieldWeight || !tds || !extractionYield) {
        return null
      }

      return {
        extraction_targets: {
          dose_g: dose,
          yield_g: yieldWeight,
          tds_percent: tds,
          extraction_yield_percent: extractionYield,
          last_saved_at: savedAt,
        },
      }
    }
    case 'temperature_converter': {
      const fahrenheit = getBoundedNumber(context.inputs, 'fahrenheit', 32, 260)
      const celsius = getBoundedNumber(context.inputs, 'celsius', 0, 127)

      if (!fahrenheit || !celsius) {
        return null
      }

      return {
        brew_temperature_targets: {
          fahrenheit,
          celsius,
          last_saved_at: savedAt,
        },
      }
    }
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const context = sanitizeCalculatorContext(body?.context)

    if (!context) {
      return NextResponse.json({ error: 'Invalid calculator context payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseLoose = supabase as unknown as SupabaseClient<LooseDatabase>

    const { data: profile, error: profileError } = await supabaseLoose
      .from('profiles')
      .select('deep_context, active_context, active_organization_id, active_location_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Calculator context profile load failed:', profileError.message)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const savedAt = new Date().toISOString()
    const preferencePatch = buildPreferencePatch(context, savedAt)

    if (!preferencePatch) {
      return NextResponse.json({ error: 'Calculator values out of allowed bounds' }, { status: 400 })
    }

    const deepContext = asRecord(profile.deep_context)
    const preferences = asRecord(deepContext.preferences)
    const custom = asRecord(deepContext.custom)

    const calculatorUsage = asRecord(custom.calculator_usage)
    const existingUsage = asRecord(calculatorUsage[context.calculator])
    const priorSaveCount =
      typeof existingUsage.save_count === 'number' && Number.isFinite(existingUsage.save_count)
        ? existingUsage.save_count
        : 0

    const calculatorHistory = Array.isArray(custom.calculator_history)
      ? custom.calculator_history.filter(isRecord).slice(0, 19)
      : []

    const nextDeepContext = {
      ...deepContext,
      preferences: {
        ...preferences,
        ...preferencePatch,
      },
      custom: {
        ...custom,
        calculator_usage: {
          ...calculatorUsage,
          [context.calculator]: {
            save_count: priorSaveCount + 1,
            last_saved_at: savedAt,
            last_summary: context.summary,
          },
        },
        calculator_history: [
          {
            calculator: context.calculator,
            title: context.title,
            summary: context.summary,
            saved_at: savedAt,
            inputs: context.inputs,
            outputs: context.outputs,
          },
          ...calculatorHistory,
        ].slice(0, 20),
      },
    }

    const activeContext = asRecord(profile.active_context)
    const existingRecentActivity = Array.isArray(activeContext.recent_activity)
      ? activeContext.recent_activity
      : []

    const nextActiveContext = activeContextToJson({
      ...activeContext,
      current_focus: `Dialing in ${context.title.toLowerCase()}`,
      session_hint: 'Saved calculator targets for upcoming brew advice',
      recent_activity: [
        {
          type: 'calculator_saved',
          calculator: context.calculator,
          summary: context.summary,
          at: savedAt,
        },
        ...existingRecentActivity,
      ].slice(0, 8),
    })

    const profileUpdate: Record<string, Json | string | null> = {
      deep_context: nextDeepContext as Json,
      active_context: nextActiveContext as Json,
      updated_at: savedAt,
      updated_by: 'user:calculator-save',
    }

    const activeOrganizationId = getOptionalUuid(profile.active_organization_id)
    const activeLocationId = getOptionalUuid(profile.active_location_id)

    if (activeLocationId) {
      if (!activeOrganizationId) {
        profileUpdate.active_location_id = null
      } else {
        const { data: activeLocation } = await supabaseLoose
          .from('organization_locations')
          .select('id')
          .eq('id', activeLocationId)
          .eq('organization_id', activeOrganizationId)
          .maybeSingle()

        if (!activeLocation) {
          profileUpdate.active_location_id = null
        }
      }
    }

    const { error } = await supabaseLoose
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', user.id)

    if (error) {
      console.error('Calculator context save failed:', error.message)
      return NextResponse.json({ error: 'Failed to save calculator context' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      calculator: context.calculator,
      savedAt,
      message: 'Calculator targets saved to your profile',
    })
  } catch (error) {
    console.error('Calculator context API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
