import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getSupportTicketLabel,
  lookupSupportTicket,
  notifySupportReporter,
  resolveSupportTicket,
  upsertEngineeringStatus,
  type SupportActorType,
  type SupportTriageStatus,
  type SupportTicketStatus,
  type SupportCategory,
  type SupportSeverity,
  type EngineeringWorkflowStatus,
} from '@/lib/support/workflow'

const ALLOWED_TRIAGE_STATUSES = new Set<SupportTriageStatus>([
  'pending',
  'needs_info',
  'actionable',
  'non_actionable',
  'completed',
])

const ALLOWED_TICKET_STATUSES = new Set<SupportTicketStatus>([
  'new',
  'triage',
  'queued_engineering',
  'in_progress',
  'in_review',
  'resolved',
  'closed',
])

const ALLOWED_CATEGORIES = new Set<SupportCategory>([
  'bug',
  'account',
  'billing',
  'feature_request',
  'how_to',
  'other',
])

const ALLOWED_SEVERITIES = new Set<SupportSeverity>(['low', 'medium', 'high', 'critical'])
const ALLOWED_ENGINEERING_WORKFLOW_STATUSES = new Set<EngineeringWorkflowStatus>([
  'queued',
  'in_progress',
  'in_review',
  'merged',
  'released',
  'cancelled',
])

function parseLookup(raw: string): { id?: string; ticketNumber?: number } {
  const trimmed = raw.trim()
  if (/^\d+$/.test(trimmed)) {
    return { ticketNumber: Number.parseInt(trimmed, 10) }
  }

  return { id: trimmed }
}

function resolveActorType(raw: unknown): SupportActorType {
  if (raw === 'support_agent' || raw === 'operator' || raw === 'github_webhook' || raw === 'user') {
    return raw
  }

  return 'system'
}

function requireAutomationKey(request: Request): string | null {
  const expected = process.env.SUPPORT_AUTOMATION_KEY
  if (!expected) {
    return 'SUPPORT_AUTOMATION_KEY is not configured'
  }

  const provided = request.headers.get('x-support-automation-key')
  if (!provided || provided !== expected) {
    return 'Unauthorized'
  }

  return null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireAutomationKey(request)
  if (authError) {
    const status = authError === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: authError }, { status })
  }

  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Ticket id required' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const action = typeof body.action === 'string' ? body.action : ''
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const ticket = await lookupSupportTicket(supabase, parseLookup(id))

    if (!ticket) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
    }

    const actorType = resolveActorType(body.actorType)
    const actorId = typeof body.actorId === 'string' ? body.actorId : null

    if (action === 'triage') {
      const triageStatus = body.triageStatus
      const ticketStatus = body.ticketStatus
      const severity = body.severity
      const category = body.category

      if (typeof triageStatus !== 'string' || !ALLOWED_TRIAGE_STATUSES.has(triageStatus as SupportTriageStatus)) {
        return NextResponse.json({ error: 'Invalid triageStatus' }, { status: 400 })
      }

      if (typeof ticketStatus !== 'string' || !ALLOWED_TICKET_STATUSES.has(ticketStatus as SupportTicketStatus)) {
        return NextResponse.json({ error: 'Invalid ticketStatus' }, { status: 400 })
      }

      if (severity !== undefined && (typeof severity !== 'string' || !ALLOWED_SEVERITIES.has(severity as SupportSeverity))) {
        return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
      }

      if (category !== undefined && (typeof category !== 'string' || !ALLOWED_CATEGORIES.has(category as SupportCategory))) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }

      const { data: updatedTicket, error: triageError } = await supabase
        .from('support_tickets')
        .update({
          triage_status: triageStatus,
          ticket_status: ticketStatus,
          triage_notes: typeof body.triageNotes === 'string' ? body.triageNotes : ticket.triage_notes,
          severity: typeof severity === 'string' ? severity : ticket.severity,
          category: typeof category === 'string' ? category : ticket.category,
          latest_customer_status:
            typeof body.customerStatus === 'string'
              ? body.customerStatus
              : `${getSupportTicketLabel(ticket.ticket_number)} triage updated: ${triageStatus}.`,
        })
        .eq('id', ticket.id)
        .select('*')
        .single()

      if (triageError || !updatedTicket) {
        return NextResponse.json({ error: triageError?.message ?? 'Failed to update triage state' }, { status: 500 })
      }

      if (body.notifyReporter === true) {
        await notifySupportReporter(supabase, {
          ticket: updatedTicket,
          message:
            typeof body.customerStatus === 'string'
              ? body.customerStatus
              : `${getSupportTicketLabel(updatedTicket.ticket_number)} triage updated: ${triageStatus}.`,
          actorType,
          actorId,
          eventType: 'triage_notification_sent',
        })
      }

      if (triageStatus === 'actionable' && body.queueEngineering !== false) {
        await upsertEngineeringStatus(supabase, {
          supportTicketId: updatedTicket.id,
          workflowStatus: 'queued',
          actorType,
          actorId,
          notifyReporter: body.notifyReporter === true,
        })
      }

      return NextResponse.json({
        ticket: {
          id: updatedTicket.id,
          ticketNumber: updatedTicket.ticket_number,
          ticketLabel: getSupportTicketLabel(updatedTicket.ticket_number),
          triageStatus: updatedTicket.triage_status,
          status: updatedTicket.ticket_status,
          severity: updatedTicket.severity,
          category: updatedTicket.category,
          latestCustomerStatus: updatedTicket.latest_customer_status,
        },
      })
    }

    if (action === 'engineering_status') {
      const workflowStatus = body.workflowStatus
      if (
        typeof workflowStatus !== 'string' ||
        !ALLOWED_ENGINEERING_WORKFLOW_STATUSES.has(workflowStatus as EngineeringWorkflowStatus)
      ) {
        return NextResponse.json({ error: 'Invalid workflowStatus' }, { status: 400 })
      }

      const statusResult = await upsertEngineeringStatus(supabase, {
        supportTicketId: ticket.id,
        workflowStatus: workflowStatus as EngineeringWorkflowStatus,
        actorType,
        actorId,
        operatorNotes: typeof body.operatorNotes === 'string' ? body.operatorNotes : null,
        branchName: typeof body.branchName === 'string' ? body.branchName : null,
        pullRequestNumber:
          typeof body.pullRequestNumber === 'number' && Number.isInteger(body.pullRequestNumber)
            ? body.pullRequestNumber
            : null,
        pullRequestUrl: typeof body.pullRequestUrl === 'string' ? body.pullRequestUrl : null,
        repoOwner: typeof body.repoOwner === 'string' ? body.repoOwner : null,
        repoName: typeof body.repoName === 'string' ? body.repoName : null,
        linkedIssueIdentifier:
          typeof body.linkedIssueIdentifier === 'string' ? body.linkedIssueIdentifier : null,
        resolutionSummary: typeof body.resolutionSummary === 'string' ? body.resolutionSummary : null,
        notifyReporter: body.notifyReporter === true,
      })

      return NextResponse.json({
        ticket: {
          id: statusResult.ticket.id,
          ticketNumber: statusResult.ticket.ticket_number,
          ticketLabel: getSupportTicketLabel(statusResult.ticket.ticket_number),
          status: statusResult.ticket.ticket_status,
          triageStatus: statusResult.ticket.triage_status,
          latestCustomerStatus: statusResult.ticket.latest_customer_status,
          resolutionSummary: statusResult.ticket.resolution_summary,
        },
        engineering: {
          id: statusResult.engineeringTask.id,
          status: statusResult.engineeringTask.workflow_status,
          branchName: statusResult.engineeringTask.branch_name,
          pullRequestNumber: statusResult.engineeringTask.pull_request_number,
          pullRequestUrl: statusResult.engineeringTask.pull_request_url,
        },
      })
    }

    if (action === 'resolve') {
      if (typeof body.resolutionSummary !== 'string' || !body.resolutionSummary.trim()) {
        return NextResponse.json({ error: 'resolutionSummary is required' }, { status: 400 })
      }

      const resolved = await resolveSupportTicket(supabase, {
        supportTicketId: ticket.id,
        resolutionSummary: body.resolutionSummary,
        actorType,
        actorId,
        notifyReporter: body.notifyReporter === true,
      })

      return NextResponse.json({
        ticket: {
          id: resolved.id,
          ticketNumber: resolved.ticket_number,
          ticketLabel: getSupportTicketLabel(resolved.ticket_number),
          status: resolved.ticket_status,
          triageStatus: resolved.triage_status,
          resolutionSummary: resolved.resolution_summary,
          latestCustomerStatus: resolved.latest_customer_status,
        },
      })
    }

    if (action === 'notify') {
      if (typeof body.message !== 'string' || !body.message.trim()) {
        return NextResponse.json({ error: 'message is required for notify action' }, { status: 400 })
      }

      await notifySupportReporter(supabase, {
        ticket,
        message: body.message,
        actorType,
        actorId,
        eventType: 'manual_status_notification',
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
