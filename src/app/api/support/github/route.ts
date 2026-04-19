import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertEngineeringStatus, type EngineeringWorkflowStatus } from '@/lib/support/workflow'

interface PullRequestEventPayload {
  action: string
  pull_request?: {
    number: number
    merged?: boolean
    html_url?: string | null
    head?: {
      ref?: string | null
    }
  }
  repository?: {
    name?: string | null
    owner?: {
      login?: string | null
    }
  }
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const digest = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

  const provided = Buffer.from(signature)
  const expected = Buffer.from(digest)

  if (provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}

function mapPullRequestAction(action: string, merged: boolean): EngineeringWorkflowStatus | null {
  if (action === 'opened' || action === 'reopened' || action === 'ready_for_review' || action === 'synchronize') {
    return 'in_review'
  }

  if (action === 'closed' && merged) {
    return 'merged'
  }

  if (action === 'closed' && !merged) {
    return 'cancelled'
  }

  return null
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-hub-signature-256')
    const eventType = request.headers.get('x-github-event')
    const webhookSecret = process.env.SUPPORT_GITHUB_WEBHOOK_SECRET
    const automationKey = process.env.SUPPORT_AUTOMATION_KEY

    const rawBody = await request.text()

    if (webhookSecret) {
      if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid GitHub webhook signature' }, { status: 401 })
      }
    } else {
      const providedAutomationKey = request.headers.get('x-support-automation-key')
      if (!automationKey || !providedAutomationKey || providedAutomationKey !== automationKey) {
        return NextResponse.json(
          { error: 'Missing webhook secret and invalid automation key' },
          { status: 401 }
        )
      }
    }

    if (eventType !== 'pull_request') {
      return NextResponse.json({ ignored: true, reason: 'Unsupported GitHub event type' })
    }

    const payload = JSON.parse(rawBody) as PullRequestEventPayload

    const action = payload.action
    const pullRequestNumber = payload.pull_request?.number
    const merged = payload.pull_request?.merged === true
    const repoOwner = payload.repository?.owner?.login ?? null
    const repoName = payload.repository?.name ?? null

    if (!action || !pullRequestNumber || !repoOwner || !repoName) {
      return NextResponse.json({ error: 'Missing pull request context in webhook payload' }, { status: 400 })
    }

    const workflowStatus = mapPullRequestAction(action, merged)
    if (!workflowStatus) {
      return NextResponse.json({ ignored: true, reason: `Action ${action} does not map to support workflow` })
    }

    const supabase = createAdminClient()

    const { data: engineeringTask, error: lookupError } = await supabase
      .from('support_engineering_tasks')
      .select('support_ticket_id')
      .eq('repo_owner', repoOwner)
      .eq('repo_name', repoName)
      .eq('pull_request_number', pullRequestNumber)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    if (!engineeringTask) {
      return NextResponse.json({ ignored: true, reason: 'No support-linked engineering task for this PR' })
    }

    const prUrl = payload.pull_request?.html_url ?? null
    const branchName = payload.pull_request?.head?.ref ?? null

    const statusResult = await upsertEngineeringStatus(supabase, {
      supportTicketId: engineeringTask.support_ticket_id,
      workflowStatus,
      actorType: 'github_webhook',
      actorId: `github:${repoOwner}/${repoName}#${pullRequestNumber}`,
      pullRequestNumber,
      pullRequestUrl: prUrl,
      branchName,
      repoOwner,
      repoName,
      notifyReporter: workflowStatus === 'in_review' || workflowStatus === 'merged',
      resolutionSummary:
        workflowStatus === 'merged'
          ? `Pull request #${pullRequestNumber} merged into ${repoOwner}/${repoName}.`
          : null,
    })

    return NextResponse.json({
      updated: true,
      supportTicketId: statusResult.ticket.id,
      ticketStatus: statusResult.ticket.ticket_status,
      engineeringStatus: statusResult.engineeringTask.workflow_status,
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
