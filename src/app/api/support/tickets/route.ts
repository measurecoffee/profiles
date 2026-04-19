import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupportTicketLabel } from '@/lib/support/workflow'

interface SupportTicketSummaryRow {
  id: string
  ticket_number: number
  title: string
  category: string
  severity: string
  triage_status: string
  ticket_status: string
  latest_customer_status: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface SupportEngineeringSummaryRow {
  support_ticket_id: string
  workflow_status: string
  branch_name: string | null
  pull_request_url: string | null
  pull_request_number: number | null
}

function parseLimit(value: string | null): number {
  if (!value) return 25
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 25
  return Math.max(1, Math.min(parsed, 100))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, title, category, severity, triage_status, ticket_status, latest_customer_status, created_at, updated_at, resolved_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (ticketsError) {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 })
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ tickets: [] })
    }

    const ticketIds = tickets.map((ticket) => ticket.id)

    const { data: engineeringRows, error: engineeringError } = await supabase
      .from('support_engineering_tasks')
      .select('support_ticket_id, workflow_status, branch_name, pull_request_url, pull_request_number')
      .in('support_ticket_id', ticketIds)

    if (engineeringError) {
      return NextResponse.json({ error: engineeringError.message }, { status: 500 })
    }

    const engineeringByTicketId = new Map<string, SupportEngineeringSummaryRow>()
    for (const task of (engineeringRows ?? []) as SupportEngineeringSummaryRow[]) {
      engineeringByTicketId.set(task.support_ticket_id, task)
    }

    return NextResponse.json({
      tickets: (tickets as SupportTicketSummaryRow[]).map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        ticketLabel: getSupportTicketLabel(ticket.ticket_number),
        title: ticket.title,
        category: ticket.category,
        severity: ticket.severity,
        triageStatus: ticket.triage_status,
        status: ticket.ticket_status,
        latestCustomerStatus: ticket.latest_customer_status,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        resolvedAt: ticket.resolved_at,
        engineering: engineeringByTicketId.has(ticket.id)
          ? {
              status: engineeringByTicketId.get(ticket.id)?.workflow_status,
              branchName: engineeringByTicketId.get(ticket.id)?.branch_name,
              pullRequestUrl: engineeringByTicketId.get(ticket.id)?.pull_request_url,
              pullRequestNumber: engineeringByTicketId.get(ticket.id)?.pull_request_number,
            }
          : null,
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
