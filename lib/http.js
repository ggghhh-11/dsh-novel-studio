/**
 * Minimal HTTP surface for the Client half plus its request gate.
 *
 * These routes live on the bare webServer (not the /api fence), so the gate
 * here is the security boundary: only loopback authorities are served, and a
 * mutating request must be same-origin when the browser states an Origin.
 */

import { ROLES } from './roles.js'

const MAX_BODY = 4096

const ROLE_IDS = new Set(ROLES.map((role) => role.id))

export function loopbackAuthority(host) {
  if (typeof host !== 'string' || host.length === 0) return false
  const lower = host.toLowerCase()
  const name = lower.startsWith('[') ? lower.slice(0, lower.indexOf(']') + 1) : lower.split(':')[0]
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]'
}

function hostnameOf(authority) {
  try {
    const url = new URL(`http://${authority}`)
    return url.hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Whether a request may touch plugin state.
 * Reads require a loopback Host; writes additionally require same-origin.
 */
export function isAdmitted(request, { mutating = false } = {}) {
  const host = request?.headers?.host
  if (host === undefined || host === null || host === '') return false
  if (!loopbackAuthority(host)) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  if (!mutating) return true
  const origin = request.headers.origin
  if (origin === undefined || origin === null || origin === '') return true
  try {
    const originUrl = new URL(origin)
    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') return false
    if (hostnameOf(host) !== originUrl.hostname.toLowerCase()) return false
    return originUrl.host === host || originUrl.port === '' || host.split(':').length === 1
  } catch {
    return false
  }
}

export function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(payload))
}

/** Parse a tiny JSON body, rejecting anything over the cap. */
export async function readJsonBody(request, maxBytes = MAX_BODY) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.length === 0) return {}
  const parsed = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('request body must be a JSON object')
  }
  return parsed
}

function clampInt(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

/** Normalize the settings accepted from the panel. */
export function normalizePanelSettings(raw, current = {}) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const next = {
    rounds: clampInt(source.rounds, 0, 4, clampInt(current.rounds, 0, 4, 2)),
    chapterWords: clampInt(source.chapterWords, 800, 8000, clampInt(current.chapterWords, 800, 8000, 2500)),
    scanThreshold: clampInt(source.scanThreshold, 50, 95, clampInt(current.scanThreshold, 50, 95, 70)),
    autoChart: typeof source.autoChart === 'boolean' ? source.autoChart : current.autoChart !== false,
    autoHelp: typeof source.autoHelp === 'boolean' ? source.autoHelp : current.autoHelp !== false,
    outputMode: source.outputMode === 'chat' || source.outputMode === 'file'
      ? source.outputMode
      : (current.outputMode === 'chat' ? 'chat' : 'file'),
    autoPopup: typeof source.autoPopup === 'boolean' ? source.autoPopup : current.autoPopup !== false,
    panelTheme: source.panelTheme === 'light' || source.panelTheme === 'dark' || source.panelTheme === 'auto'
      ? source.panelTheme
      : (current.panelTheme === 'light' || current.panelTheme === 'dark' ? current.panelTheme : 'auto'),
    outputDir: typeof source.outputDir === 'string'
      ? source.outputDir.trim().slice(0, 200)
      : (typeof current.outputDir === 'string' ? current.outputDir : ''),
    selectedRoles: (() => {
      const sourceList = Array.isArray(source.selectedRoles)
        ? source.selectedRoles
        : (Array.isArray(current.selectedRoles) ? current.selectedRoles : [])
      const unique = []
      for (const id of sourceList) {
        if (typeof id !== 'string' || !ROLE_IDS.has(id) || unique.includes(id)) continue
        unique.push(id)
      }
      return unique.slice(0, ROLES.length)
    })(),
    twist: clampInt(source.twist, 0, 100, clampInt(current.twist, 0, 100, 30)),
    platform: typeof source.platform === 'string'
      ? source.platform.trim().slice(0, 40)
      : (typeof current.platform === 'string' ? current.platform : ''),
  }
  return next
}

/**
 * Build the route list handed to `ctx.webServer.register`.
 * @param {{ state: () => object | Promise<object>, charts: (slug?:string) => object,
 *           activate: () => Promise<{ delivered: boolean }>,
 *           settings: (patch: object) => object }} api
 */
export function createRoutes(api) {
  const routes = []
  routes.push({
    kind: 'exact',
    path: '/novel-studio/state',
    handler: async (request, response) => {
      if (!isAdmitted(request)) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        sendJson(response, 200, { ok: true, ...(await api.state()) })
      } catch (error) {
        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/charts',
    handler: async (request, response) => {
      if (!isAdmitted(request)) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        const url = new URL(request.url ?? '/', 'http://localhost')
        sendJson(response, 200, { ok: true, ...(await api.charts(url.searchParams.get('slug') ?? undefined)) })
      } catch (error) {
        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/roles',
    handler: (request, response) => {
      if (!isAdmitted(request)) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        sendJson(response, 200, { ok: true, roles: api.roles() })
      } catch (error) {
        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/hooks',
    handler: (request, response) => {
      if (!isAdmitted(request)) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        sendJson(response, 200, { ok: true, ...api.hooks() })
      } catch (error) {
        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/output',
    handler: async (request, response) => {
      if (!isAdmitted(request)) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        sendJson(response, 200, { ok: true, ...(await api.output()) })
      } catch (error) {
        sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/activate',
    handler: async (request, response) => {
      if (!isAdmitted(request, { mutating: true })) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'POST') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        const body = await readJsonBody(request)
        const result = await api.activate(body)
        sendJson(response, 200, { ok: true, ...result })
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  routes.push({
    kind: 'exact',
    path: '/novel-studio/settings',
    handler: async (request, response) => {
      if (!isAdmitted(request, { mutating: true })) return sendJson(response, 403, { ok: false, error: 'untrusted request' })
      if (request.method !== 'POST') return sendJson(response, 405, { ok: false, error: 'method not allowed' })
      try {
        const body = await readJsonBody(request)
        sendJson(response, 200, { ok: true, settings: api.settings(body) })
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  return routes
}
