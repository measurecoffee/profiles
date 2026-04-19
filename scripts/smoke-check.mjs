const baseUrl = process.env.BASE_URL?.trim()
const deepHealth = /^(1|true|yes)$/i.test(process.env.DEEP_HEALTH ?? '')
const healthcheckKey = process.env.HEALTHCHECK_KEY?.trim()

if (!baseUrl) {
  console.error('BASE_URL is required')
  process.exit(1)
}

const normalizedBaseUrl = new URL(baseUrl).toString().replace(/\/$/, '')

async function request(path, init = {}) {
  const url = new URL(path, `${normalizedBaseUrl}/`)
  const response = await fetch(url, init)

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

  return {
    url: url.toString(),
    response,
    bodyText,
    json,
  }
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

await runCheck('landing page responds', async () => {
  const result = await request('/')
  assert(result.response.status === 200, `expected 200, received ${result.response.status}`)
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
  const result = await request('/chat', { redirect: 'manual' })
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
    redirect: 'manual',
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
