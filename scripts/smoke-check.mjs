const baseUrl = process.env.BASE_URL?.trim()
const deepHealth = parseBoolean(process.env.DEEP_HEALTH)
const healthcheckKey = process.env.HEALTHCHECK_KEY?.trim()
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()

const authSmokeRequired = parseBoolean(process.env.AUTH_SMOKE_REQUIRED)
const smokeUserEmail = process.env.SMOKE_TEST_USER_EMAIL?.trim()
const smokeUserPassword = process.env.SMOKE_TEST_USER_PASSWORD?.trim()
const smokeSupabaseUrl = process.env.SMOKE_TEST_SUPABASE_URL?.trim()
const smokeSupabaseAnonKey = process.env.SMOKE_TEST_SUPABASE_ANON_KEY?.trim()
const checkoutPlanId = process.env.SMOKE_CHECKOUT_PLAN_ID?.trim() || 'tier1'

if (!baseUrl) {
  console.error('BASE_URL is required')
  process.exit(1)
}

const normalizedBaseUrl = new URL(baseUrl).toString().replace(/\/$/, '')
const authConfigFields = {
  SMOKE_TEST_USER_EMAIL: smokeUserEmail,
  SMOKE_TEST_USER_PASSWORD: smokeUserPassword,
  SMOKE_TEST_SUPABASE_URL: smokeSupabaseUrl,
  SMOKE_TEST_SUPABASE_ANON_KEY: smokeSupabaseAnonKey,
}

const hasAnyAuthConfig = Object.values(authConfigFields).some(Boolean)
const authSmokeEnabled = authSmokeRequired || hasAnyAuthConfig

if (authSmokeEnabled) {
  const missing = Object.entries(authConfigFields)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  assert(
    missing.length === 0,
    `authenticated smoke checks are enabled but missing required env vars: ${missing.join(', ')}`
  )
}

function parseBoolean(value) {
  return /^(1|true|yes)$/i.test(value ?? '')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function runCheck(name, fn) {
  process.stdout.write(`- ${name}... `)
  await fn()
  console.log('ok')
}

/**
 * Obtain a _vercel_jwt cookie that bypasses Vercel Deployment Protection,
 * then perform the actual request with that cookie.
 */
async function obtainVercelJwtCookie() {
  if (!vercelAutomationBypassSecret) return null

  const headers = new Headers()
  headers.set('x-vercel-protection-bypass', vercelAutomationBypassSecret)
  headers.set('x-vercel-set-bypass-cookie', 'true')

  const response = await fetch(`${normalizedBaseUrl}/`, {
    method: 'GET',
    headers,
    redirect: 'manual',
  })

  const setCookies = response.headers.getSetCookie?.() ?? []
  const jwtCookie = setCookies.find(c => c.startsWith('_vercel_jwt='))

  if (jwtCookie) {
    return jwtCookie.split(';')[0]
  }

  return null
}

function mergeCookieHeader({ authCookie, existingCookie }) {
  const cookieParts = []

  if (vercelJwtCookie) {
    cookieParts.push(vercelJwtCookie)
  }

  if (authCookie) {
    cookieParts.push(authCookie)
  }

  if (existingCookie) {
    cookieParts.push(existingCookie)
  }

  return cookieParts.length > 0 ? cookieParts.join('; ') : null
}

async function request(path, init = {}, options = {}) {
  const url = new URL(path, `${normalizedBaseUrl}/`).toString()
  const headers = new Headers(init.headers ?? {})
  const mergedCookieHeader = mergeCookieHeader({
    authCookie: options.authCookie ?? null,
    existingCookie: headers.get('cookie'),
  })

  if (mergedCookieHeader) {
    headers.set('Cookie', mergedCookieHeader)
  }

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: 'manual',
  })

  let bodyText = ''
  try {
    bodyText = await response.text()
  } catch {
    bodyText = ''
  }

  let json = null
  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      json = JSON.parse(bodyText)
    } catch {
      json = null
    }
  }

  return { url, response, bodyText, json }
}

function deriveSupabaseStorageKey(supabaseUrl) {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  assert(projectRef, `could not derive Supabase project ref from "${supabaseUrl}"`)
  return `sb-${projectRef}-auth-token`
}

function encodeSessionCookieValue(session) {
  const raw = JSON.stringify(session)
  return `base64-${Buffer.from(raw, 'utf8').toString('base64url')}`
}

async function requestSupabase(path, init, authContext) {
  const url = new URL(path, `${smokeSupabaseUrl}/`).toString()
  const headers = new Headers(init?.headers ?? {})
  headers.set('apikey', smokeSupabaseAnonKey)
  headers.set('Authorization', `Bearer ${authContext.accessToken}`)

  if (init?.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    redirect: 'manual',
  })

  let bodyText = ''
  try {
    bodyText = await response.text()
  } catch {
    bodyText = ''
  }

  let json = null
  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      json = JSON.parse(bodyText)
    } catch {
      json = null
    }
  }

  return { response, bodyText, json }
}

async function authenticateSmokeUser() {
  const response = await fetch(
    new URL('/auth/v1/token?grant_type=password', `${smokeSupabaseUrl}/`).toString(),
    {
      method: 'POST',
      headers: {
        apikey: smokeSupabaseAnonKey,
        authorization: `Bearer ${smokeSupabaseAnonKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: smokeUserEmail,
        password: smokeUserPassword,
      }),
      redirect: 'manual',
    }
  )

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  assert(
    response.ok,
    `auth token request failed: status=${response.status} body=${JSON.stringify(payload)}`
  )

  const accessToken = payload?.access_token
  const refreshToken = payload?.refresh_token
  const expiresIn = payload?.expires_in
  const userId = payload?.user?.id
  const userEmail = payload?.user?.email

  assert(accessToken, 'auth token response missing access_token')
  assert(refreshToken, 'auth token response missing refresh_token')
  assert(Number.isFinite(expiresIn), 'auth token response missing expires_in')
  assert(userId, 'auth token response missing user.id')

  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn)
  const cookieName = deriveSupabaseStorageKey(smokeSupabaseUrl)
  const cookieValue = encodeSessionCookieValue({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    expires_in: Number(expiresIn),
    token_type: payload?.token_type ?? 'bearer',
  })

  return {
    accessToken,
    userId,
    userEmail,
    authCookie: `${cookieName}=${cookieValue}`,
  }
}

// Resolve the JWT cookie once at startup so all checks can reuse it
const vercelJwtCookie = await obtainVercelJwtCookie()

if (vercelJwtCookie) {
  console.log('- Vercel Deployment Protection bypass cookie obtained')
} else if (vercelAutomationBypassSecret) {
  console.warn(
    '! WARNING: VERCEL_AUTOMATION_BYPASS_SECRET was set but no _vercel_jwt cookie was obtained'
  )
}

await runCheck('landing page responds or redirects to canonical domain', async () => {
  const result = await request('/')
  const status = result.response.status
  assert(
    status === 200 || status === 301 || status === 302 || status === 307 || status === 308,
    status === 401
      ? 'expected 2xx/3xx, received 401. This preview is protected by Vercel Deployment Protection; set VERCEL_AUTOMATION_BYPASS_SECRET for CI smoke checks.'
      : `expected 2xx/3xx, received ${status}`
  )
  if (status >= 300 && status < 400) {
    const location = result.response.headers.get('location') ?? ''
    assert(
      new URL(location).hostname === new URL(normalizedBaseUrl).hostname ||
        location.includes('measure.coffee'),
      `expected redirect to same host or canonical domain, received "${location}"`
    )
  }
})

await runCheck('login page responds', async () => {
  const result = await request('/auth/login')
  assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
})

await runCheck('signup page responds', async () => {
  const result = await request('/auth/signup')
  assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
})

await runCheck('protected chat route redirects to login', async () => {
  const result = await request('/chat')
  assert(
    [302, 303, 307, 308].includes(result.response.status),
    `expected redirect, received ${result.response.status}`
  )

  const location = result.response.headers.get('location') ?? ''
  assert(location.includes('/auth/login'), `expected login redirect, received "${location}"`)
})

await runCheck('chat threads API rejects anonymous access', async () => {
  const result = await request('/api/chat/threads', {
    headers: {
      accept: 'application/json',
    },
  })

  assert(
    [401, 403].includes(result.response.status),
    `expected 401/403, received ${result.response.status}`
  )
})

await runCheck('shallow health endpoint passes', async () => {
  const result = await request('/api/health')
  assert(result.response.ok, `expected 2xx, received ${result.response.status}`)
  assert(result.json, 'expected JSON body from /api/health')
  assert(result.json.status !== 'error', `health returned error: ${JSON.stringify(result.json)}`)
})

if (deepHealth) {
  await runCheck('deep health endpoint passes', async () => {
    const headers = {}
    if (healthcheckKey) {
      headers['x-healthcheck-key'] = healthcheckKey
    }

    const result = await request('/api/health?mode=deep', {
      headers,
    })

    assert(result.response.ok, `expected 2xx, received ${result.response.status}: ${result.bodyText}`)
    assert(result.json, 'expected JSON body from deep health endpoint')
    assert(result.json.status !== 'error', `deep health returned error: ${JSON.stringify(result.json)}`)
  })
}

if (authSmokeEnabled) {
  let authContext = null
  let supportThreadId = null

  await runCheck('smoke user password login succeeds', async () => {
    authContext = await authenticateSmokeUser()
    assert(authContext.userId, 'missing authenticated user id')
  })

  await runCheck('authenticated chat route returns app content', async () => {
    const result = await request('/chat', { headers: { accept: 'text/html' } }, { authCookie: authContext.authCookie })
    assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
  })

  await runCheck('authenticated chat thread list loads', async () => {
    const result = await request(
      '/api/chat/threads',
      { headers: { accept: 'application/json' } },
      { authCookie: authContext.authCookie }
    )
    assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
    assert(Array.isArray(result.json?.threads), 'expected threads array in response')
  })

  await runCheck('authenticated support/report submission path creates a thread', async () => {
    const result = await request(
      '/api/chat/threads',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ title: `Support report smoke ${new Date().toISOString()}` }),
      },
      { authCookie: authContext.authCookie }
    )

    assert(result.response.status === 201, `expected 201, received ${result.response.status}`)
    supportThreadId = result.json?.thread?.id ?? null
    assert(supportThreadId, `expected created thread id, received ${result.bodyText}`)
  })

  await runCheck('authenticated chat thread detail loads', async () => {
    assert(supportThreadId, 'missing support thread id from create check')
    const result = await request(
      `/api/chat/threads/${supportThreadId}`,
      { headers: { accept: 'application/json' } },
      { authCookie: authContext.authCookie }
    )
    assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
    assert(Array.isArray(result.json?.messages), 'expected messages array in thread detail response')
  })

  await runCheck('billing checkout entry point responds for authenticated user', async () => {
    const result = await request(
      '/api/stripe/checkout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ planId: checkoutPlanId }),
      },
      { authCookie: authContext.authCookie }
    )

    assert(
      [200, 503].includes(result.response.status),
      `expected 200 or 503, received ${result.response.status}: ${result.bodyText}`
    )

    if (result.response.status === 200) {
      assert(typeof result.json?.url === 'string', 'expected checkout session URL in response')
    } else {
      assert(
        typeof result.json?.error === 'string',
        `expected billing configuration error, received ${result.bodyText}`
      )
    }
  })

  await runCheck('representative profile/settings mutation succeeds and restores', async () => {
    const loadResult = await requestSupabase(
      `/rest/v1/profiles?user_id=eq.${encodeURIComponent(authContext.userId)}&select=id,updated_by&limit=1`,
      { headers: { accept: 'application/json' } },
      authContext
    )

    assert(
      loadResult.response.ok,
      `failed loading profile for mutation check: ${loadResult.response.status} ${loadResult.bodyText}`
    )
    assert(Array.isArray(loadResult.json), 'expected profile array response')
    assert(loadResult.json.length === 1, `expected exactly one profile row, received ${loadResult.bodyText}`)

    const profile = loadResult.json[0]
    assert(profile?.id, `profile id missing from response: ${loadResult.bodyText}`)
    const previousUpdatedBy = typeof profile.updated_by === 'string' ? profile.updated_by : 'user'
    const mutationMarker = `release-smoke:${new Date().toISOString()}`

    const mutateResult = await requestSupabase(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}&select=id,updated_by`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { updated_by: mutationMarker },
      },
      authContext
    )

    assert(
      mutateResult.response.ok,
      `profile mutation failed: ${mutateResult.response.status} ${mutateResult.bodyText}`
    )
    assert(
      Array.isArray(mutateResult.json) && mutateResult.json[0]?.updated_by === mutationMarker,
      `profile mutation marker was not persisted: ${mutateResult.bodyText}`
    )

    const restoreResult = await requestSupabase(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { updated_by: previousUpdatedBy },
      },
      authContext
    )

    assert(
      restoreResult.response.ok,
      `profile mutation restore failed: ${restoreResult.response.status} ${restoreResult.bodyText}`
    )
  })
} else {
  console.warn('! WARNING: authenticated smoke checks are disabled (set AUTH_SMOKE_REQUIRED=true to enforce)')
}

console.log(`Smoke checks passed for ${normalizedBaseUrl}`)
