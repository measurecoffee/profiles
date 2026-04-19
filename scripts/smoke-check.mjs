const baseUrl = process.env.BASE_URL?.trim()
const deepHealth = /^(1|true|yes)$/i.test(process.env.DEEP_HEALTH ?? '')
const healthcheckKey = process.env.HEALTHCHECK_KEY?.trim()
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()

if (!baseUrl) {
  console.error('BASE_URL is required')
  process.exit(1)
}

const normalizedBaseUrl = new URL(baseUrl).toString().replace(/\/$/, '')

/**
 * Obtain a _vercel_jwt cookie that bypasses Vercel Deployment Protection,
 * then perform the actual request with that cookie.
 *
 * Vercel's Deployment Protection bypass flow:
 *   1. Send x-vercel-protection-bypass + x-vercel-set-bypass-cookie headers
 *   2. Vercel responds 307 to same URL + set-cookie: _vercel_jwt=...
 *   3. Re-request with the _vercel_jwt cookie → app responds normally
 *
 * Node.js native fetch strips custom headers on cross-origin redirects by
 * spec and has no cookie jar, so we must handle this manually.
 */
async function obtainVercelJwtCookie(baseUrl) {
  if (!vercelAutomationBypassSecret) return null

  const headers = new Headers()
  headers.set('x-vercel-protection-bypass', vercelAutomationBypassSecret)
  headers.set('x-vercel-set-bypass-cookie', 'true')

  const response = await fetch(`${baseUrl}/`, { method: 'GET', headers, redirect: 'manual' })

  const setCookies = response.headers.getSetCookie?.() ?? []
  const jwtCookie = setCookies.find(c => c.startsWith('_vercel_jwt='))

  if (jwtCookie) {
    // Extract just the cookie name=value part (before the first semicolon)
    return jwtCookie.split(';')[0]
  }

  // No JWT cookie — maybe protection isn't enabled, or the bypass secret is wrong
  return null
}

// Resolve the JWT cookie once at startup so all checks can reuse it
const vercelJwtCookie = await obtainVercelJwtCookie(normalizedBaseUrl)

async function request(path, init = {}) {
  const url = new URL(path, `${normalizedBaseUrl}/`).toString()
  const headers = new Headers(init.headers ?? {})

  // Send the _vercel_jwt cookie to bypass Vercel Deployment Protection
  if (vercelJwtCookie) {
    headers.set('Cookie', vercelJwtCookie)
  }

  // Use redirect: 'manual' so we return app-level redirects to the caller
  const response = await fetch(url, {
    ...init,
    headers,
    redirect: 'manual',
  })

  let bodyText = ''
  try { bodyText = await response.text() } catch { bodyText = '' }

  let json = null
  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    try { json = JSON.parse(bodyText) } catch { json = null }
  }

  return { url, response, bodyText, json }
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

if (vercelJwtCookie) {
  console.log('- Vercel Deployment Protection bypass cookie obtained')
} else if (vercelAutomationBypassSecret) {
  console.warn('! WARNING: VERCEL_AUTOMATION_BYPASS_SECRET was set but no _vercel_jwt cookie was obtained')
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
      new URL(location).hostname === new URL(normalizedBaseUrl).hostname || location.includes('measure.coffee'),
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

console.log(`Smoke checks passed for ${normalizedBaseUrl}`)