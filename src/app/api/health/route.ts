import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'warn' | 'error'

interface CheckResult {
  status: CheckStatus
  message: string
  durationMs?: number
}

function readEnv(name: string) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function summarize(checks: Record<string, CheckResult>): CheckStatus {
  const values = Object.values(checks)
  if (values.some((check) => check.status === 'error')) return 'error'
  if (values.some((check) => check.status === 'warn')) return 'warn'
  return 'ok'
}

function envPresenceCheck(names: string[], message: string, missingIs: Exclude<CheckStatus, 'ok'>): CheckResult {
  const missing = names.filter((name) => !readEnv(name))
  if (missing.length === 0) {
    return {
      status: 'ok',
      message,
    }
  }

  return {
    status: missingIs,
    message: `Missing env: ${missing.join(', ')}`,
  }
}

function appUrlCheck(requestHost: string): CheckResult {
  const configured = readEnv('NEXT_PUBLIC_APP_URL')
  if (!configured) {
    return {
      status: 'warn',
      message: 'NEXT_PUBLIC_APP_URL is not configured',
    }
  }

  try {
    const configuredHost = new URL(configured).host
    if (configuredHost === requestHost) {
      return {
        status: 'ok',
        message: `NEXT_PUBLIC_APP_URL matches request host (${requestHost})`,
      }
    }

    return {
      status: 'warn',
      message: `NEXT_PUBLIC_APP_URL points to ${configuredHost}, request host is ${requestHost}`,
    }
  } catch {
    return {
      status: 'error',
      message: 'NEXT_PUBLIC_APP_URL is not a valid URL',
    }
  }
}

async function supabaseCheck(): Promise<CheckResult> {
  const start = Date.now()

  if (!readEnv('NEXT_PUBLIC_SUPABASE_URL') || !readEnv('SUPABASE_SERVICE_ROLE_KEY')) {
    return {
      status: 'error',
      message: 'Missing Supabase deep-health configuration',
    }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .select('user_id', { head: true, count: 'exact' })
      .limit(1)

    if (error) {
      return {
        status: 'error',
        message: `Supabase query failed: ${error.message}`,
        durationMs: Date.now() - start,
      }
    }

    return {
      status: 'ok',
      message: 'Supabase reachable',
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Supabase health check failed',
      durationMs: Date.now() - start,
    }
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') === 'deep' ? 'deep' : 'shallow'
  const requestHost = request.nextUrl.host

  if (mode === 'deep') {
    const configuredKey = readEnv('DEPLOYMENT_SMOKE_TEST_KEY')
    const providedKey = request.headers.get('x-healthcheck-key')

    if (!configuredKey) {
      return NextResponse.json(
        {
          status: 'error',
          mode,
          error: 'DEPLOYMENT_SMOKE_TEST_KEY is not configured',
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    if (providedKey !== configuredKey) {
      return NextResponse.json(
        {
          status: 'error',
          mode,
          error: 'Unauthorized',
        },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
  }

  const checks: Record<string, CheckResult> = {
    runtime: {
      status: 'ok',
      message: 'Application runtime is serving requests',
    },
    publicAuth: envPresenceCheck(
      ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      'Public Supabase auth configuration is present',
      'error'
    ),
    appUrl: appUrlCheck(requestHost),
  }

  if (mode === 'deep') {
    checks.supabase = await supabaseCheck()
    checks.chat = envPresenceCheck(
      ['OPENROUTER_API_KEY'],
      'Chat provider configuration is present',
      'warn'
    )
    checks.billing = envPresenceCheck(
      ['STRIPE_SECRET_KEY', 'STRIPE_TIER1_PRICE_ID', 'STRIPE_TIER2_PRICE_ID', 'NEXT_PUBLIC_APP_URL'],
      'Billing configuration is present',
      'warn'
    )
    checks.phoneVerification = envPresenceCheck(
      ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID'],
      'Phone verification configuration is present',
      'warn'
    )
    checks.supportAutomation = envPresenceCheck(
      ['SUPPORT_AUTOMATION_KEY'],
      'Support automation configuration is present',
      'warn'
    )
  }

  const status = summarize(checks)

  return NextResponse.json(
    {
      status,
      mode,
      timestamp: new Date().toISOString(),
      environment: {
        requestHost,
        vercelEnv: readEnv('VERCEL_ENV'),
        vercelUrl: readEnv('VERCEL_URL'),
        gitCommitSha: readEnv('VERCEL_GIT_COMMIT_SHA'),
      },
      checks,
    },
    {
      status: status === 'error' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
