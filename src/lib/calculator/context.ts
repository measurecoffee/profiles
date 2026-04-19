const CALCULATOR_CONTEXT_VERSION = 1
const MAX_TEXT_LENGTH = 600
const MAX_OBJECT_KEYS = 24
const MAX_NUMBER_ABS = 1_000_000

export const CALCULATOR_CONTEXT_STORAGE_KEY = 'measure:calculator:pending-context'

export const CALCULATOR_TYPES = [
  'brew_ratio',
  'extraction_yield',
  'temperature_converter',
] as const

export type CalculatorType = (typeof CALCULATOR_TYPES)[number]

type CalculatorNumericMap = Record<string, number>
type CalculatorOutputValue = number | string
type CalculatorOutputMap = Record<string, CalculatorOutputValue>

export interface CalculatorContextPayload {
  version: typeof CALCULATOR_CONTEXT_VERSION
  calculator: CalculatorType
  title: string
  generatedAt: string
  summary: string
  chatPrompt: string
  inputs: CalculatorNumericMap
  outputs: CalculatorOutputMap
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) return null
  return trimmed
}

function sanitizeNumericMap(value: unknown): CalculatorNumericMap | null {
  if (!isRecord(value)) return null
  const entries = Object.entries(value)
  if (entries.length === 0 || entries.length > MAX_OBJECT_KEYS) return null

  const result: CalculatorNumericMap = {}
  for (const [key, raw] of entries) {
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(key)) return null
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
    if (Math.abs(raw) > MAX_NUMBER_ABS) return null
    result[key] = Number(raw.toFixed(4))
  }

  return result
}

function sanitizeOutputMap(value: unknown): CalculatorOutputMap | null {
  if (!isRecord(value)) return null
  const entries = Object.entries(value)
  if (entries.length === 0 || entries.length > MAX_OBJECT_KEYS) return null

  const result: CalculatorOutputMap = {}
  for (const [key, raw] of entries) {
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(key)) return null

    if (typeof raw === 'number') {
      if (!Number.isFinite(raw) || Math.abs(raw) > MAX_NUMBER_ABS) return null
      result[key] = Number(raw.toFixed(4))
      continue
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed || trimmed.length > 128) return null
      result[key] = trimmed
      continue
    }

    return null
  }

  return result
}

export function sanitizeCalculatorContext(value: unknown): CalculatorContextPayload | null {
  if (!isRecord(value)) return null

  const version = value.version
  if (version !== CALCULATOR_CONTEXT_VERSION) return null

  const calculator =
    typeof value.calculator === 'string' &&
    (CALCULATOR_TYPES as ReadonlyArray<string>).includes(value.calculator)
      ? (value.calculator as CalculatorType)
      : null

  if (!calculator) return null

  const title = sanitizeText(value.title)
  const summary = sanitizeText(value.summary)
  const chatPrompt = sanitizeText(value.chatPrompt)
  if (!title || !summary || !chatPrompt) return null

  if (title.length > 80) return null

  if (typeof value.generatedAt !== 'string') return null
  const generatedAt = new Date(value.generatedAt)
  if (Number.isNaN(generatedAt.getTime())) return null

  const inputs = sanitizeNumericMap(value.inputs)
  const outputs = sanitizeOutputMap(value.outputs)
  if (!inputs || !outputs) return null

  return {
    version: CALCULATOR_CONTEXT_VERSION,
    calculator,
    title,
    generatedAt: generatedAt.toISOString(),
    summary,
    chatPrompt,
    inputs,
    outputs,
  }
}

export function queueCalculatorContext(context: CalculatorContextPayload): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CALCULATOR_CONTEXT_STORAGE_KEY, JSON.stringify(context))
}

export function readQueuedCalculatorContext(): CalculatorContextPayload | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(CALCULATOR_CONTEXT_STORAGE_KEY)
  if (!raw) return null

  try {
    return sanitizeCalculatorContext(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearQueuedCalculatorContext(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CALCULATOR_CONTEXT_STORAGE_KEY)
}
