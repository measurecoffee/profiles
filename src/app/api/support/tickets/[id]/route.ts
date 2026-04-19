import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupportTicketLabel } from '@/lib/support/workflow'

interface SupportTicketDetailRow {
  id: string
  user_id: string
  ticket_number: number
  title: string
  description: string
  source: string
  category: string
  severity: string
  triage_status: string
  triage_notes: string | null
  ticket_status: string
  resolution_summary: string | null
  latest_customer_status: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  last_user_notified_at: string | null
}

interface SupportEngineeringDetailRow {
  id: string
  support_ticket_id: string
  workflow_status: string
  branch_name: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  repo_owner: string | null
  repo_name: string | null
  linked_issue_identifier: string | null
  operator_notes: string | null
  created_at: string
  updated_at: string
  merged_at: string | null
  released_at: string | null
}

interface SupportEventRow {
  id: string
  actor_type: string
  actor_id: string | null
  event_type: string
  event_payload: Record<string, unknown>
  created_at: string
}

interface SupportNotificationRow {
  id: string
  channel: string
  delivery_status: string
  message: string
  delivered_at: string | null
  created_at: string
}

function parseTicketLookup(raw: string): { by: 'id' | 'ticket_number'; value: string | number } {
  const trimmed = raw.trim()
  if (/^\d+$/.test(trimmed)) {
    return { by: 'ticket_number', value: Number.parseInt(trimmed, 10) }
  }

  return { by: 'id', value: trimmed }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Ticket id required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lookup = parseTicketLookup(id)

    let query = supabase
      .from('support_tickets')
      .select('id, user_id, ticket_number, title, description, source, category, severity, triage_status, triage_notes, ticket_status, resolution_summary, latest_customer_status, created_at, updated_at, resolved_at, last_user_notified_at')
      .eq('user_id', user.id)

    if (lookup.by === 'ticket_number') {
      query = query.eq('ticket_number', lookup.value as number)
    } else {
      query = query.eq('id', lookup.value as string)
    }

    const { data: ticket, error: ticketError } = await query.maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
    }

    const { data: engineeringTask, error: engineeringError } = await supabase
      .from('support_engineering_tasks')
      .select('id, support_ticket_id, workflow_status, branch_name, pull_request_number, pull_request_url, repo_owner, repo_name, linked_issue_identifier, operator_notes, created_at, updated_at, merged_at, released_at')
      .eq('support_ticket_id', ticket.id)
      .maybeSingle()

    if (engineeringError) {
      return NextResponse.json({ error: engineeringError.message }, { status: 500 })
    }

    const { data: events, error: eventsError } = await supabase
      .from('support_ticket_events')
      .select('id, actor_type, actor_id, event_type, event_payload, created_at')
      .eq('support_ticket_id', ticket.id)
      .order('created_at', { ascending: true })

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    const { data: notifications, error: notificationsError } = await supabase
      .from('support_notifications')
      .select('id, channel, delivery_status, message, delivered_at, created_at')
      .eq('support_ticket_id', ticket.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (notificationsError) {
      return NextResponse.json({ error: notificationsError.message }, { status: 500 })
    }

    const detail = ticket as SupportTicketDetailRow
    const engineering = engineeringTask as SupportEngineeringDetailRow | null

    return NextResponse.json({
      ticket: {
        id: detail.id,
        ticketNumber: detail.ticket_number,
        ticketLabel: getSupportTicketLabel(detail.ticket_number),
        title: detail.title,
        description: detail.description,
        source: detail.source,
        category: detail.category,
        severity: detail.severity,
        triageStatus: detail.triage_status,
        triageNotes: detail.triage_notes,
        status: detail.ticket_status,
        resolutionSummary: detail.resolution_summary,
        latestCustomerStatus: detail.latest_customer_status,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
        resolvedAt: detail.resolved_at,
        lastUserNotifiedAt: detail.last_user_notified_at,
      },
      engineering: engineering
        ? {
            id: engineering.id,
            status: engineering.workflow_status,
            branchName: engineering.branch_name,
            pullRequestNumber: engineering.pull_request_number,
            pullRequestUrl: engineering.pull_request_url,
            repository:
              engineering.repo_owner && engineering.repo_name
                ? `${engineering.repo_owner}/${engineering.repo_name}`
                : null,
            linkedIssueIdentifier: engineering.linked_issue_identifier,
            operatorNotes: engineering.operator_notes,
            createdAt: engineering.created_at,
            updatedAt: engineering.updated_at,
            mergedAt: engineering.merged_at,
            releasedAt: engineering.released_at,
          }
        : null,
      events: ((events ?? []) as SupportEventRow[]).map((event) => ({
        id: event.id,
        actorType: event.actor_type,
        actorId: event.actor_id,
        eventType: event.event_type,
        eventPayload: event.event_payload,
        createdAt: event.created_at,
      })),
      notifications: ((notifications ?? []) as SupportNotificationRow[]).map((notification) => ({
        id: notification.id,
        channel: notification.channel,
        deliveryStatus: notification.delivery_status,
        message: notification.message,
        deliveredAt: notification.delivered_at,
        createdAt: notification.created_at,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
