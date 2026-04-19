const baseUrl = process.env.BASE_URL?.trim()
const deepHealth = /^(1|true|yes)$/i.test(process.env.DEEP_HEALTH ?? '')
const healthcheckKey = process.env.HEALTHCHECK_KEY?.trim()
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()

if (!baseUrl) {
  console.error('BASE_URL is required')
  process.exit(1)
}

const normalizedBaseUrl = new URL(baseUrl).toString().replace(/\/$/, '')
const MAX_PROTECTION_HOPS = 5

/**
 * Send a request that transparently handles Vercel Deployment Protection
 * redirects while preserving the caller's intent for app-level redirects.
 *
 * The problem: Node.js native fetch strips custom headers on cross-origin
 * redirects by spec, which breaks Vercel Deployment Protection bypass and
 * causes infinite redirect loops.
 *
 * Vercel's protection bypass flow:
 *   1. Request includes x-vercel-protection-bypass + x-vercel-set-bypass-cookie
 *   2. Vercel responds with 307 → same URL, set-cookie: _vercel_jwt
 *   3. Follow that one redirect → app responds normally
 *
 * We only follow "protection redirects" (same-URL 307 with _vercel_jwt cookie).
 * App-level redirects (different URL) are returned to the caller as-is.
 */
async function request(path, init = {}) {
  let url = new URL(path, `${normalizedBaseUrl}/`).toString()
  const method = init.method ?? 'GET'

  for (let hops = 0; hops <= MAX_PROTECTION_HOPS; hops++) {
    const headers = new Headers(init.headers ?? {})

    if (vercelAutomationBypassSecret) {
      headers.set('x-vercel-protection-bypass', vercelAutomationBypassSecret)
      headers.set('x-vercel-set-bypass-cookie', 'true')
    }

    const response = await fetch(url, {
      ...init,
      method,
      headers,
      redirect: 'manual', // we handle Vercel protection redirects ourselves
    })

    // Not a redirect, or not a Vercel protection redirect → return as-is
    if (response.status < 300 || response.status >= 400) {
      let bodyText = ''
      try { bodyText = await response.text() } catch { bodyText = '' }

      let json = null
      if ((response.headers.get('content-type') ?? '').includes('application/json')) {
        try { json = JSON.parse(bodyText) } catch { json = null }
      }

      return { url, response, bodyText, json }
    }

    // It's a redirect. Is it a Vercel protection redirect?
    // Vercel protection redirects to the SAME URL with a _vercel_jwt set-cookie.
    const location = response.headers.get('location') ?? ''
    const hasJwtCookie = (response.headers.get('set-cookie') ?? '').includes('_vercel_jwt')

    // Resolve the location to compare
    const resolvedLocation = new URL(location, url).toString()

    // Same-URL redirect with JWT cookie → Vercel protection gate, follow it
    if (hasJwtCookie && resolvedLocation.replace(/\/$/, '') === url.replace(/\/$/, '')) {
      // Follow this protection redirect (re-send with bypass headers on next loop iteration)
      continue
    }

    // Any other redirect → this is an app-level redirect, return to caller
    let bodyText = ''
    try { bodyText = await response.text() } catch { bodyText = '' }

    let json = null
    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      try { json = JSON.parse(bodyText) } catch { json = null }
    }

    return { url, response, bodyText, json }
  }

  throw new Error(`Exceeded maximum Vercel protection redirect hops (${MAX_PROTECTION_HOPS})`)
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