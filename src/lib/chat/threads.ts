const FALLBACK_THREAD_TITLE = 'New conversation'
const MAX_THREAD_TITLE_LENGTH = 80
const MAX_THREAD_PREVIEW_LENGTH = 90

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function deriveThreadTitle(userMessage: string): string {
  const normalized = normalizeWhitespace(userMessage)
  if (!normalized) return FALLBACK_THREAD_TITLE
  if (normalized.length <= MAX_THREAD_TITLE_LENGTH) return normalized
  return `${normalized.slice(0, MAX_THREAD_TITLE_LENGTH - 3).trimEnd()}...`
}

export function buildThreadPreview(content: string): string {
  const normalized = normalizeWhitespace(content)
  if (!normalized) return ''
  if (normalized.length <= MAX_THREAD_PREVIEW_LENGTH) return normalized
  return `${normalized.slice(0, MAX_THREAD_PREVIEW_LENGTH - 3).trimEnd()}...`
}

export function fallbackThreadTitle(): string {
  return FALLBACK_THREAD_TITLE
}
