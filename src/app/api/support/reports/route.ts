import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildSupportIntakeReply,
  createSupportTicketFromIntake,
  getSupportTicketLabel,
  type SupportSource,
} from '@/lib/support/workflow'

const ALLOWED_SOURCES = new Set<SupportSource>(['chat', 'in_app_form', 'sms', 'email', 'manual'])

function asSupportSource(value: unknown): SupportSource {
  if (typeof value === 'string' && ALLOWED_SOURCES.has(value as SupportSource)) {
    return value as SupportSource
  }

  return 'in_app_form'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const description = typeof body.description === 'string' ? body.description : ''
    if (!description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const result = await createSupportTicketFromIntake(supabase, {
      userId: user.id,
      source: asSupportSource(body.source),
      description,
      title: typeof body.title === 'string' ? body.title : undefined,
      sourceThreadId: typeof body.threadId === 'string' ? body.threadId : null,
      sourceMessageId: typeof body.messageId === 'string' ? body.messageId : null,
      reporterTimezone: typeof body.timezone === 'string' ? body.timezone : null,
      actorType: 'user',
      actorId: user.id,
    })

    return NextResponse.json(
      {
        ticket: {
          id: result.ticket.id,
          ticketNumber: result.ticket.ticket_number,
          ticketLabel: getSupportTicketLabel(result.ticket.ticket_number),
          status: result.ticket.ticket_status,
          triageStatus: result.ticket.triage_status,
          severity: result.ticket.severity,
          category: result.ticket.category,
          createdAt: result.ticket.created_at,
          latestCustomerStatus: result.ticket.latest_customer_status,
        },
        engineeringTask: result.engineeringTask
          ? {
              id: result.engineeringTask.id,
              status: result.engineeringTask.workflow_status,
              branchName: result.engineeringTask.branch_name,
              repoOwner: result.engineeringTask.repo_owner,
              repoName: result.engineeringTask.repo_name,
            }
          : null,
        message: buildSupportIntakeReply(result),
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = /at least \d+ characters/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
