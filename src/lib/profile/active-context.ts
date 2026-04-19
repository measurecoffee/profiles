import type { CalculatorContextPayload } from '@/lib/calculator/context'

const MAX_FOCUS_LENGTH = 120
const MAX_HINT_LENGTH = 140
const MAX_ISSUE_LENGTH = 64
const MAX_ISSUES = 4
const MAX_ACTIVITY_SUMMARY_LENGTH = 180
const MAX_ACTIVITY_ITEMS = 6
const MAX_PROMPT_ACTIVITY_ITEMS = 3
const MAX_PROMPT_ISSUES = 3

export interface ChatTurnMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ActiveContextActivity {
  type: string
  summary: string
  at: string | null
}

export interface ActiveContextState {
  current_focus: string | null
  recent_activity: ActiveContextActivity[]
  active_issues: string[]
  session_hint: string | null
}

export interface ActiveContextSummary {
  currentFocus: string | null
  sessionHint: string | null
  activeIssues: string[]
  recentActivity: ActiveContextActivity[]
}

interface BuildActiveContextInput {
  previous: unknown
  conversation: ChatTurnMessage[]
  latestUserMessage: string
  latestAssistantMessage: string
  calculatorContext?: CalculatorContextPayload | null
  capturedAt?: string
}

interface FocusRule {
  focus: string
  regex: RegExp
}

interface IssueRule {
  label: string
  regex: RegExp
}

const FOCUS_RULES: FocusRule[] = [
  { focus: 'Dialing espresso extraction', regex: /\b(espresso|shot|portafilter|channeling)\b/i },
  { focus: 'Improving pour-over consistency', regex: /\b(pour[\s-]?over|v60|chemex|kalita)\b/i },
  { focus: 'Optimizing grinder settings', regex: /\b(grind|grinder|burr)\b/i },
  { focus: 'Adjusting brew temperature and timing', regex: /\b(temperature|temp|bloom|brew time)\b/i },
  { focus: 'Refining brew ratio and dose', regex: /\b(ratio|dose|yield|tds|extraction)\b/i },
  { focus: 'Selecting coffee and roast profile', regex: /\b(bean|origin|roast|coffee)\b/i },
]

const ISSUE_RULES: IssueRule[] = [
  { label: 'Bitter cup', regex: /\btoo bitter|bitterness|over[- ]extract/i },
  { label: 'Sour cup', regex: /\btoo sour|sourness|under[- ]extract/i },
  { label: 'Weak body', regex: /\btoo weak|watery|thin body/i },
  { label: 'Overly strong cup', regex: /\btoo strong|harsh|intense/i },
  { label: 'Inconsistent extraction', regex: /\binconsistent|uneven extraction|channeling/i },
  { label: 'Grind size mismatch', regex: /\bgrind size|grinder setting|ground too\b/i },
  { label: 'Water temperature mismatch', regex: /\bwater temp|temperature\b/i },
  { label: 'Low brew yield', regex: /\blow yield|not enough output/i },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clip(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function sanitizeShortText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = normalizeWhitespace(value)
  if (!cleaned) return null
  return clip(cleaned, maxLength)
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function parseIssues(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const parsed = value
    .map((item) => sanitizeShortText(item, MAX_ISSUE_LENGTH))
    .filter((item): item is string => Boolean(item))
  return dedupeStrings(parsed).slice(0, MAX_ISSUES)
}

function parseRecentActivityItem(value: unknown): ActiveContextActivity | null {
  if (typeof value === 'string') {
    const summary = sanitizeShortText(value, MAX_ACTIVITY_SUMMARY_LENGTH)
    if (!summary) return null
    return { type: 'note', summary, at: null }
  }

  if (!isRecord(value)) return null

  const summary =
    sanitizeShortText(value.summary, MAX_ACTIVITY_SUMMARY_LENGTH) ??
    sanitizeShortText(value.activity, MAX_ACTIVITY_SUMMARY_LENGTH) ??
    sanitizeShortText(value.note, MAX_ACTIVITY_SUMMARY_LENGTH) ??
    sanitizeShortText(value.text, MAX_ACTIVITY_SUMMARY_LENGTH)

  if (!summary) return null

  const type = sanitizeShortText(value.type, 32) ?? sanitizeShortText(value.kind, 32) ?? 'activity'
  const at = toIsoOrNull(value.at) ?? toIsoOrNull(value.timestamp) ?? toIsoOrNull(value.created_at)

  return { type, summary, at }
}

function parseRecentActivity(value: unknown): ActiveContextActivity[] {
  if (!Array.isArray(value)) return []

  const parsed = value
    .map(parseRecentActivityItem)
    .filter((item): item is ActiveContextActivity => Boolean(item))

  const deduped: ActiveContextActivity[] = []
  for (const item of parsed) {
    if (deduped.some((existing) => existing.summary === item.summary)) continue
    deduped.push(item)
  }

  return deduped.slice(0, MAX_ACTIVITY_ITEMS)
}

function hasMeaningfulContext(context: ActiveContextState): boolean {
  return Boolean(
    context.current_focus ||
      context.session_hint ||
      context.active_issues.length > 0 ||
      context.recent_activity.length > 0
  )
}

function inferFocus(
  latestUserMessage: string,
  calculatorContext?: CalculatorContextPayload | null
): string | null {
  if (calculatorContext?.title) {
    return sanitizeShortText(
      `Dialing in ${calculatorContext.title.toLowerCase()}`,
      MAX_FOCUS_LENGTH
    )
  }

  for (const rule of FOCUS_RULES) {
    if (rule.regex.test(latestUserMessage)) {
      return rule.focus
    }
  }

  return sanitizeShortText(`Working on: ${latestUserMessage}`, MAX_FOCUS_LENGTH)
}

function extractIssuesFromText(text: string): string[] {
  const issues: string[] = []

  for (const rule of ISSUE_RULES) {
    if (rule.regex.test(text)) {
      issues.push(rule.label)
    }
  }

  const freeformMatches = text.match(
    /\b(?:issue|problem|trouble|struggling with|stuck with|can't|cannot)\s+([^.!?;]{4,80})/i
  )

  if (freeformMatches?.[1]) {
    const extracted = sanitizeShortText(
      freeformMatches[1].replace(/\b(my|the|a)\b/gi, ''),
      MAX_ISSUE_LENGTH
    )
    if (extracted) issues.push(extracted)
  }

  return dedupeStrings(issues)
}

function inferIssues(conversation: ChatTurnMessage[], previousIssues: string[]): string[] {
  const userMessages = conversation
    .filter((message) => message.role === 'user')
    .map((message) => sanitizeShortText(message.content, 240))
    .filter((message): message is string => Boolean(message))
    .slice(-6)

  const inferred: string[] = []

  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    const issues = extractIssuesFromText(userMessages[i])
    for (const issue of issues) {
      if (inferred.includes(issue)) continue
      inferred.push(issue)
      if (inferred.length >= MAX_ISSUES) break
    }
    if (inferred.length >= MAX_ISSUES) break
  }

  if (inferred.length > 0) return inferred
  return previousIssues.slice(0, MAX_ISSUES)
}

function inferSessionHint(args: {
  focus: string | null
  issues: string[]
  calculatorContext?: CalculatorContextPayload | null
}): string | null {
  const { focus, issues, calculatorContext } = args

  if (calculatorContext?.summary) {
    return sanitizeShortText(
      `Use calculator outputs in the next reply: ${calculatorContext.summary}`,
      MAX_HINT_LENGTH
    )
  }

  if (issues.length > 0) {
    return sanitizeShortText(
      `Continue troubleshooting ${issues[0].toLowerCase()}.`,
      MAX_HINT_LENGTH
    )
  }

  if (focus) {
    return sanitizeShortText(`Keep momentum on ${focus.toLowerCase()}.`, MAX_HINT_LENGTH)
  }

  return null
}

function buildActivitySummary(args: {
  latestUserMessage: string
  latestAssistantMessage: string
  calculatorContext?: CalculatorContextPayload | null
}): string | null {
  const userSnippet = sanitizeShortText(args.latestUserMessage, 90)
  if (!userSnippet) return null

  const assistantSnippet = sanitizeShortText(args.latestAssistantMessage, 90)
  const calculatorSnippet = sanitizeShortText(args.calculatorContext?.title, 48)

  let summary = `Asked: ${userSnippet}`

  if (assistantSnippet) {
    summary += ` | Agent: ${assistantSnippet}`
  }

  if (calculatorSnippet) {
    summary += ` | Context: ${calculatorSnippet}`
  }

  return clip(summary, MAX_ACTIVITY_SUMMARY_LENGTH)
}

export function normalizeActiveContext(value: unknown): ActiveContextState {
  if (!isRecord(value)) {
    return {
      current_focus: null,
      recent_activity: [],
      active_issues: [],
      session_hint: null,
    }
  }

  return {
    current_focus: sanitizeShortText(value.current_focus, MAX_FOCUS_LENGTH),
    recent_activity: parseRecentActivity(value.recent_activity),
    active_issues: parseIssues(value.active_issues),
    session_hint: sanitizeShortText(value.session_hint, MAX_HINT_LENGTH),
  }
}

export function summarizeActiveContext(value: unknown): ActiveContextSummary {
  const context = normalizeActiveContext(value)
  return {
    currentFocus: context.current_focus,
    sessionHint: context.session_hint,
    activeIssues: context.active_issues,
    recentActivity: context.recent_activity,
  }
}

export function activeContextToJson(value: unknown): Record<string, unknown> {
  const context = normalizeActiveContext(value)
  return {
    current_focus: context.current_focus,
    recent_activity: context.recent_activity.map((activity) => ({
      type: activity.type,
      summary: activity.summary,
      at: activity.at,
    })),
    active_issues: context.active_issues,
    session_hint: context.session_hint,
  }
}

export function formatActiveContextForPrompt(value: unknown): string | null {
  const context = normalizeActiveContext(value)
  if (!hasMeaningfulContext(context)) return null

  const lines: string[] = []

  if (context.current_focus) {
    lines.push(`Current focus: ${context.current_focus}`)
  }

  if (context.session_hint) {
    lines.push(`Session hint: ${context.session_hint}`)
  }

  if (context.active_issues.length > 0) {
    lines.push(`Active issues: ${context.active_issues.slice(0, MAX_PROMPT_ISSUES).join('; ')}`)
  }

  if (context.recent_activity.length > 0) {
    lines.push('Recent activity:')
    for (const item of context.recent_activity.slice(0, MAX_PROMPT_ACTIVITY_ITEMS)) {
      lines.push(`- ${item.summary}`)
    }
  }

  return lines.length > 0 ? lines.join('\n') : null
}

export function buildActiveContextFromChatTurn(input: BuildActiveContextInput): ActiveContextState {
  const previous = normalizeActiveContext(input.previous)
  const latestUserMessage = sanitizeShortText(input.latestUserMessage, 240)

  if (!latestUserMessage) {
    return previous
  }

  const capturedAt = toIsoOrNull(input.capturedAt) ?? new Date().toISOString()
  const focus = inferFocus(latestUserMessage, input.calculatorContext) ?? previous.current_focus
  const issues = inferIssues(input.conversation, previous.active_issues)
  const sessionHint =
    inferSessionHint({
      focus,
      issues,
      calculatorContext: input.calculatorContext,
    }) ?? previous.session_hint

  const nextActivitySummary = buildActivitySummary({
    latestUserMessage,
    latestAssistantMessage: input.latestAssistantMessage,
    calculatorContext: input.calculatorContext,
  })

  const latestActivity = nextActivitySummary
    ? [
        {
          type: input.calculatorContext ? 'chat_turn_with_calculator' : 'chat_turn',
          summary: nextActivitySummary,
          at: capturedAt,
        } satisfies ActiveContextActivity,
      ]
    : []

  const mergedActivity: ActiveContextActivity[] = []
  for (const item of [...latestActivity, ...previous.recent_activity]) {
    if (mergedActivity.some((existing) => existing.summary === item.summary)) continue
    mergedActivity.push(item)
    if (mergedActivity.length >= MAX_ACTIVITY_ITEMS) break
  }

  const next: ActiveContextState = {
    current_focus: focus,
    recent_activity: mergedActivity,
    active_issues: issues,
    session_hint: sessionHint,
  }

  if (!hasMeaningfulContext(next)) {
    return previous
  }

  return next
}
