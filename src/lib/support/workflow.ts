import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveThreadTitle } from '@/lib/chat/threads'
import type { Database, Json } from '@/types/supabase'

export type SupportSource = 'chat' | 'in_app_form' | 'sms' | 'email' | 'manual'
export type SupportCategory = 'bug' | 'account' | 'billing' | 'feature_request' | 'how_to' | 'other'
export type SupportSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SupportTriageStatus = 'pending' | 'needs_info' | 'actionable' | 'non_actionable' | 'completed'
export type SupportTicketStatus =
  | 'new'
  | 'triage'
  | 'queued_engineering'
  | 'in_progress'
  | 'in_review'
  | 'resolved'
  | 'closed'

export type EngineeringWorkflowStatus =
  | 'queued'
  | 'in_progress'
  | 'in_review'
  | 'merged'
  | 'released'
  | 'cancelled'

export type SupportActorType = 'system' | 'support_agent' | 'operator' | 'user' | 'github_webhook'

type SupportTicketRow = Database['public']['Tables']['support_tickets']['Row']
type SupportEngineeringTaskRow = Database['public']['Tables']['support_engineering_tasks']['Row']

type TypedSupabaseClient = SupabaseClient<Database>

const MIN_SUPPORT_DETAILS = 12
const SUPPORT_COMMAND = /^\s*(?:\/support|support:)\s*(.*)$/i
const TRIAGE_STATUSES: ReadonlyArray<SupportTriageStatus> = [
  'pending',
  'needs_info',
  'actionable',
  'non_actionable',
  'completed',
]

interface SupportTriageResult {
  category: SupportCategory
  severity: SupportSeverity
  triageStatus: SupportTriageStatus
  ticketStatus: SupportTicketStatus
  triageNotes: string
  shouldQueueEngineering: boolean
}

interface IntakeInsertResult {
  ticket: SupportTicketRow
  engineeringTask: SupportEngineeringTaskRow | null
  customerStatus: string
}

interface SupportRepoContext {
  repoOwner: string | null
  repoName: string | null
}

interface SupportLookup {
  id?: string
  ticketNumber?: number
}

interface EngineeringStatusUpdate {
  supportTicketId: string
  workflowStatus: EngineeringWorkflowStatus
  actorType: SupportActorType
  actorId?: string | null
  operatorNotes?: string | null
  branchName?: string | null
  pullRequestNumber?: number | null
  pullRequestUrl?: string | null
  repoOwner?: string | null
  repoName?: string | null
  linkedIssueIdentifier?: string | null
  resolutionSummary?: string | null
  notifyReporter?: boolean
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
}

function parseRepoFromEnv(): SupportRepoContext {
  const raw = process.env.GITHUB_REPOSITORY?.trim() ?? ''
  if (!raw.includes('/')) {
    return { repoOwner: null, repoName: null }
  }

  const [repoOwner, repoName] = raw.split('/')
  if (!repoOwner || !repoName) {
    return { repoOwner: null, repoName: null }
  }

  return { repoOwner, repoName }
}

function detectCategory(text: string): SupportCategory {
  if (/\b(charge|charged|invoice|refund|subscription|payment|billing|price)\b/i.test(text)) {
    return 'billing'
  }

  if (/\b(login|password|account|signup|sign up|sign in|auth|verification|phone verify|locked)\b/i.test(text)) {
    return 'account'
  }

  if (/\b(feature request|request|wishlist|would love|please add|enhancement|improvement)\b/i.test(text)) {
    return 'feature_request'
  }

  if (/\b(how do i|how to|can you explain|what does|where can i|guide me)\b/i.test(text)) {
    return 'how_to'
  }

  if (/\b(bug|error|broken|fails|failing|failure|issue|stuck|cannot|can't|crash|problem)\b/i.test(text)) {
    return 'bug'
  }

  return 'other'
}

function detectSeverity(text: string, category: SupportCategory): SupportSeverity {
  if (/\b(outage|down|production down|data loss|security|breach|critical|blocked all users)\b/i.test(text)) {
    return 'critical'
  }

  if (/\b(can't login|cannot login|cannot sign in|payment failed|charged twice|cannot checkout|app unusable)\b/i.test(text)) {
    return 'high'
  }

  if (category === 'bug' || category === 'billing' || category === 'account') {
    return 'medium'
  }

  return 'low'
}

function triageSupportReport(description: string): SupportTriageResult {
  const normalized = normalizeText(description)
  const category = detectCategory(normalized)
  const severity = detectSeverity(normalized, category)

  if (normalized.length < MIN_SUPPORT_DETAILS) {
    return {
      category,
      severity,
      triageStatus: 'needs_info',
      ticketStatus: 'triage',
      triageNotes:
        'Report is too short for actionable triage. Request concrete reproduction steps, expected behavior, and actual behavior.',
      shouldQueueEngineering: false,
    }
  }

  if (category === 'how_to') {
    return {
      category,
      severity,
      triageStatus: 'non_actionable',
      ticketStatus: 'resolved',
      triageNotes: 'Classified as support guidance request; no engineering execution required.',
      shouldQueueEngineering: false,
    }
  }

  return {
    category,
    severity,
    triageStatus: 'actionable',
    ticketStatus: 'queued_engineering',
    triageNotes: 'Actionable issue. Routed to engineering execution queue with branch/PR requirements.',
    shouldQueueEngineering: true,
  }
}

function buildBranchName(ticketNumber: number, title: string): string {
  const slug = slugify(title) || `ticket-${ticketNumber}`
  return `support/sup-${ticketNumber}-${slug}`
}

function buildInitialCustomerStatus(ticketLabel: string, triage: SupportTriageResult): string {
  if (triage.triageStatus === 'needs_info') {
    return `${ticketLabel} received. Support triage needs more detail before engineering execution.`
  }

  if (triage.shouldQueueEngineering) {
    return `${ticketLabel} triaged as actionable and queued for engineering execution.`
  }

  return `${ticketLabel} triaged as guidance/support only and resolved without engineering changes.`
}

function mapWorkflowToTicketStatus(workflowStatus: EngineeringWorkflowStatus): SupportTicketStatus {
  switch (workflowStatus) {
    case 'queued':
      return 'queued_engineering'
    case 'in_progress':
      return 'in_progress'
    case 'in_review':
      return 'in_review'
    case 'merged':
    case 'released':
      return 'resolved'
    case 'cancelled':
      return 'triage'
    default:
      return 'triage'
  }
}

function buildWorkflowCustomerStatus(ticket: SupportTicketRow, workflowStatus: EngineeringWorkflowStatus): string {
  const label = getSupportTicketLabel(ticket.ticket_number)
  switch (workflowStatus) {
    case 'queued':
      return `${label} is queued for engineering execution.`
    case 'in_progress':
      return `${label} is actively being worked on by engineering.`
    case 'in_review':
      return `${label} has an open pull request and is in review.`
    case 'merged':
      return `${label} was merged and marked resolved. You should see the fix shortly.`
    case 'released':
      return `${label} is resolved and released.`
    case 'cancelled':
      return `${label} engineering work was cancelled and returned to support triage.`
    default:
      return `${label} status updated.`
  }
}

function asTriageStatus(value: string): SupportTriageStatus {
  if (TRIAGE_STATUSES.includes(value as SupportTriageStatus)) {
    return value as SupportTriageStatus
  }

  return 'actionable'
}

export function getSupportTicketLabel(ticketNumber: number): string {
  return `SUP-${ticketNumber}`
}

export function parseSupportIntakeCommand(message: string): { details: string; isCommand: boolean } {
  const match = message.match(SUPPORT_COMMAND)
  if (!match) {
    return { details: '', isCommand: false }
  }

  return {
    details: normalizeText(match[1] ?? ''),
    isCommand: true,
  }
}

export async function appendSupportEvent(
  supabase: TypedSupabaseClient,
  args: {
    supportTicketId: string
    actorType: SupportActorType
    actorId?: string | null
    eventType: string
    eventPayload?: Json
  }
): Promise<void> {
  const { error } = await supabase.from('support_ticket_events').insert({
    support_ticket_id: args.supportTicketId,
    actor_type: args.actorType,
    actor_id: args.actorId ?? null,
    event_type: args.eventType,
    event_payload: (args.eventPayload ?? {}) as Json,
  })

  if (error) {
    console.error('Failed to append support event:', error.message)
  }
}

export async function createSupportTicketFromIntake(
  supabase: TypedSupabaseClient,
  input: {
    userId: string
    source: SupportSource
    description: string
    title?: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    reporterTimezone?: string | null
    reporterContact?: Json
    repoOwner?: string | null
    repoName?: string | null
    actorType?: SupportActorType
    actorId?: string | null
  }
): Promise<IntakeInsertResult> {
  const description = normalizeText(input.description)
  if (description.length < MIN_SUPPORT_DETAILS) {
    throw new Error(`Support report must be at least ${MIN_SUPPORT_DETAILS} characters`)
  }

  const triage = triageSupportReport(description)
  const title =
    normalizeText(input.title ?? '') ||
    clipText(deriveThreadTitle(description), 80)

  const { data: insertedTicket, error: insertTicketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: input.userId,
      source: input.source,
      source_thread_id: input.sourceThreadId ?? null,
      source_message_id: input.sourceMessageId ?? null,
      title,
      description,
      category: triage.category,
      severity: triage.severity,
      triage_status: 'pending',
      ticket_status: 'new',
      reporter_timezone: input.reporterTimezone ?? null,
      reporter_contact: (input.reporterContact ?? {}) as Json,
    })
    .select('*')
    .single()

  if (insertTicketError || !insertedTicket) {
    throw new Error(insertTicketError?.message ?? 'Failed to create support ticket')
  }

  const actorType = input.actorType ?? 'user'

  await appendSupportEvent(supabase, {
    supportTicketId: insertedTicket.id,
    actorType,
    actorId: input.actorId,
    eventType: 'ticket_created',
    eventPayload: {
      source: input.source,
      category: triage.category,
      severity: triage.severity,
    },
  })

  const ticketLabel = getSupportTicketLabel(insertedTicket.ticket_number)
  const customerStatus = buildInitialCustomerStatus(ticketLabel, triage)

  const { data: triagedTicket, error: triageUpdateError } = await supabase
    .from('support_tickets')
    .update({
      triage_status: triage.triageStatus,
      ticket_status: triage.ticketStatus,
      triage_notes: triage.triageNotes,
      latest_customer_status: customerStatus,
    })
    .eq('id', insertedTicket.id)
    .select('*')
    .single()

  if (triageUpdateError || !triagedTicket) {
    throw new Error(triageUpdateError?.message ?? 'Failed to update support triage state')
  }

  await appendSupportEvent(supabase, {
    supportTicketId: triagedTicket.id,
    actorType: 'support_agent',
    actorId: 'support-triage:rules-v1',
    eventType: 'triage_completed',
    eventPayload: {
      triageStatus: triage.triageStatus,
      ticketStatus: triage.ticketStatus,
      triageNotes: triage.triageNotes,
    },
  })

  let engineeringTask: SupportEngineeringTaskRow | null = null

  if (triage.shouldQueueEngineering) {
    const envRepo = parseRepoFromEnv()
    const repoOwner = input.repoOwner ?? envRepo.repoOwner
    const repoName = input.repoName ?? envRepo.repoName

    const { data: insertedTask, error: insertTaskError } = await supabase
      .from('support_engineering_tasks')
      .insert({
        support_ticket_id: triagedTicket.id,
        workflow_status: 'queued',
        branch_name: buildBranchName(triagedTicket.ticket_number, triagedTicket.title),
        repo_owner: repoOwner,
        repo_name: repoName,
      })
      .select('*')
      .single()

    if (insertTaskError) {
      console.error('Failed to queue engineering task:', insertTaskError.message)
    } else {
      engineeringTask = insertedTask
      await appendSupportEvent(supabase, {
        supportTicketId: triagedTicket.id,
        actorType: 'system',
        actorId: 'support-to-engineering-router',
        eventType: 'engineering_task_queued',
        eventPayload: {
          workflowStatus: insertedTask.workflow_status,
          branchName: insertedTask.branch_name,
          repoOwner: insertedTask.repo_owner,
          repoName: insertedTask.repo_name,
        },
      })
    }
  }

  return {
    ticket: triagedTicket,
    engineeringTask,
    customerStatus,
  }
}

export function buildSupportIntakeReply(result: IntakeInsertResult): string {
  const ticketLabel = getSupportTicketLabel(result.ticket.ticket_number)
  const lines = [
    `Support ticket created: ${ticketLabel}`,
    '',
    `Status: ${result.ticket.ticket_status}`,
    `Severity: ${result.ticket.severity}`,
    `Category: ${result.ticket.category}`,
    '',
    result.customerStatus,
  ]

  if (result.engineeringTask?.branch_name) {
    lines.push('', `Engineering branch template: \`${result.engineeringTask.branch_name}\``)
  }

  return lines.join('\n')
}

export async function lookupSupportTicket(
  supabase: TypedSupabaseClient,
  lookup: SupportLookup
): Promise<SupportTicketRow | null> {
  if (lookup.id) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', lookup.id)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  if (lookup.ticketNumber !== undefined) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('ticket_number', lookup.ticketNumber)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  return null
}

export async function notifySupportReporter(
  supabase: TypedSupabaseClient,
  args: {
    ticket: SupportTicketRow
    message: string
    actorType?: SupportActorType
    actorId?: string | null
    eventType?: string
  }
): Promise<void> {
  const message = normalizeText(args.message)
  if (!message) return

  const deliveredAt = new Date().toISOString()

  const { error: notificationError } = await supabase.from('support_notifications').insert({
    support_ticket_id: args.ticket.id,
    user_id: args.ticket.user_id,
    channel: args.ticket.source_thread_id ? 'in_app_chat' : 'in_app_feed',
    delivery_status: 'sent',
    message,
    delivered_at: deliveredAt,
  })

  if (notificationError) {
    console.error('Failed to persist support notification:', notificationError.message)
  }

  if (args.ticket.source_thread_id) {
    const { error: chatNotifyError } = await supabase.from('chat_messages').insert({
      thread_id: args.ticket.source_thread_id,
      user_id: args.ticket.user_id,
      role: 'assistant',
      content: message,
    })

    if (chatNotifyError) {
      console.error('Failed to post support notification into chat thread:', chatNotifyError.message)
    }
  }

  const { error: ticketUpdateError } = await supabase
    .from('support_tickets')
    .update({
      latest_customer_status: message,
      last_user_notified_at: deliveredAt,
    })
    .eq('id', args.ticket.id)

  if (ticketUpdateError) {
    console.error('Failed to update support ticket notification timestamp:', ticketUpdateError.message)
  }

  await appendSupportEvent(supabase, {
    supportTicketId: args.ticket.id,
    actorType: args.actorType ?? 'system',
    actorId: args.actorId ?? null,
    eventType: args.eventType ?? 'user_notified',
    eventPayload: {
      message,
      deliveredAt,
    },
  })
}

export async function upsertEngineeringStatus(
  supabase: TypedSupabaseClient,
  update: EngineeringStatusUpdate
): Promise<{ ticket: SupportTicketRow; engineeringTask: SupportEngineeringTaskRow }> {
  const currentTicket = await lookupSupportTicket(supabase, { id: update.supportTicketId })
  if (!currentTicket) {
    throw new Error('Support ticket not found')
  }

  const { data: engineeringTask, error: engineeringError } = await supabase
    .from('support_engineering_tasks')
    .upsert(
      {
        support_ticket_id: update.supportTicketId,
        workflow_status: update.workflowStatus,
        operator_notes: update.operatorNotes ?? null,
        branch_name: update.branchName ?? null,
        pull_request_number: update.pullRequestNumber ?? null,
        pull_request_url: update.pullRequestUrl ?? null,
        repo_owner: update.repoOwner ?? null,
        repo_name: update.repoName ?? null,
        linked_issue_identifier: update.linkedIssueIdentifier ?? null,
        merged_at:
          update.workflowStatus === 'merged' || update.workflowStatus === 'released'
            ? new Date().toISOString()
            : null,
        released_at: update.workflowStatus === 'released' ? new Date().toISOString() : null,
      },
      { onConflict: 'support_ticket_id' }
    )
    .select('*')
    .single()

  if (engineeringError || !engineeringTask) {
    throw new Error(engineeringError?.message ?? 'Failed to upsert engineering task')
  }

  const nextTicketStatus = mapWorkflowToTicketStatus(update.workflowStatus)
  const triageStatus: SupportTriageStatus =
    update.workflowStatus === 'merged' || update.workflowStatus === 'released'
      ? 'completed'
      : asTriageStatus(currentTicket.triage_status)

  const customerStatus = buildWorkflowCustomerStatus(currentTicket, update.workflowStatus)
  const resolvedAt =
    update.workflowStatus === 'merged' || update.workflowStatus === 'released'
      ? new Date().toISOString()
      : null

  const { data: updatedTicket, error: ticketUpdateError } = await supabase
    .from('support_tickets')
    .update({
      ticket_status: nextTicketStatus,
      triage_status: triageStatus,
      resolution_summary:
        update.resolutionSummary ??
        (update.workflowStatus === 'merged' || update.workflowStatus === 'released'
          ? currentTicket.resolution_summary ?? 'Fix merged through support-linked engineering workflow.'
          : currentTicket.resolution_summary),
      resolved_at: resolvedAt,
      latest_customer_status: customerStatus,
    })
    .eq('id', currentTicket.id)
    .select('*')
    .single()

  if (ticketUpdateError || !updatedTicket) {
    throw new Error(ticketUpdateError?.message ?? 'Failed to update support ticket status')
  }

  await appendSupportEvent(supabase, {
    supportTicketId: updatedTicket.id,
    actorType: update.actorType,
    actorId: update.actorId ?? null,
    eventType: 'engineering_status_updated',
    eventPayload: {
      workflowStatus: update.workflowStatus,
      ticketStatus: updatedTicket.ticket_status,
      pullRequestNumber: engineeringTask.pull_request_number,
      pullRequestUrl: engineeringTask.pull_request_url,
      branchName: engineeringTask.branch_name,
    },
  })

  if (
    update.notifyReporter &&
    (update.workflowStatus === 'in_review' ||
      update.workflowStatus === 'merged' ||
      update.workflowStatus === 'released')
  ) {
    await notifySupportReporter(supabase, {
      ticket: updatedTicket,
      message: customerStatus,
      actorType: update.actorType,
      actorId: update.actorId ?? null,
      eventType: 'status_notification_sent',
    })
  }

  return {
    ticket: updatedTicket,
    engineeringTask,
  }
}

export async function resolveSupportTicket(
  supabase: TypedSupabaseClient,
  args: {
    supportTicketId: string
    resolutionSummary: string
    actorType: SupportActorType
    actorId?: string | null
    notifyReporter?: boolean
  }
): Promise<SupportTicketRow> {
  const ticket = await lookupSupportTicket(supabase, { id: args.supportTicketId })
  if (!ticket) {
    throw new Error('Support ticket not found')
  }

  const summary = normalizeText(args.resolutionSummary)
  if (!summary) {
    throw new Error('Resolution summary is required')
  }

  const customerStatus = `${getSupportTicketLabel(ticket.ticket_number)} resolved: ${summary}`
  const resolvedAt = new Date().toISOString()

  const { data: updatedTicket, error } = await supabase
    .from('support_tickets')
    .update({
      ticket_status: 'resolved',
      triage_status: 'completed',
      resolution_summary: summary,
      resolved_at: resolvedAt,
      latest_customer_status: customerStatus,
    })
    .eq('id', ticket.id)
    .select('*')
    .single()

  if (error || !updatedTicket) {
    throw new Error(error?.message ?? 'Failed to resolve support ticket')
  }

  await appendSupportEvent(supabase, {
    supportTicketId: updatedTicket.id,
    actorType: args.actorType,
    actorId: args.actorId ?? null,
    eventType: 'ticket_resolved',
    eventPayload: {
      resolutionSummary: summary,
      resolvedAt,
    },
  })

  if (args.notifyReporter) {
    await notifySupportReporter(supabase, {
      ticket: updatedTicket,
      message: customerStatus,
      actorType: args.actorType,
      actorId: args.actorId ?? null,
      eventType: 'resolution_notification_sent',
    })
  }

  return updatedTicket
}
