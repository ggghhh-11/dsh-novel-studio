import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loopbackAuthority, isAdmitted, normalizePanelSettings, createRoutes } from '../lib/http.js'

function request(headers, method = 'GET') {
  return { method, headers, url: '/novel-studio/state' }
}

test('loopback authorities only', () => {
  assert.equal(loopbackAuthority('127.0.0.1:53760'), true)
  assert.equal(loopbackAuthority('localhost:3080'), true)
  assert.equal(loopbackAuthority('[::1]:3080'), true)
  assert.equal(loopbackAuthority('evil.com'), false)
  assert.equal(loopbackAuthority(''), false)
})

test('reads require loopback host and reject cross-site', () => {
  assert.equal(isAdmitted(request({ host: '127.0.0.1:1' })), true)
  assert.equal(isAdmitted(request({ host: 'evil.com' })), false)
  assert.equal(isAdmitted(request({ host: '127.0.0.1:1', 'sec-fetch-site': 'cross-site' })), false)
})

test('writes require same origin when stated', () => {
  const ok = request({ host: '127.0.0.1:53760', origin: 'http://127.0.0.1:53760' }, 'POST')
  assert.equal(isAdmitted(ok, { mutating: true }), true)
  const bad = request({ host: '127.0.0.1:53760', origin: 'http://evil.com' }, 'POST')
  assert.equal(isAdmitted(bad, { mutating: true }), false)
  const missing = request({ host: '127.0.0.1:53760' }, 'POST')
  assert.equal(isAdmitted(missing, { mutating: true }), true)
  const nullOrigin = request({ host: '127.0.0.1:53760', origin: 'null' }, 'POST')
  assert.equal(isAdmitted(nullOrigin, { mutating: true }), false)
})

test('panel settings clamp', () => {
  const settings = normalizePanelSettings(
    {
      rounds: 9,
      chapterWords: 10,
      scanThreshold: 200,
      outputMode: 'chat',
      autoPopup: false,
      outputDir: '  out/txt  ',
      selectedRoles: ['ai-flavor-hunter', 'bogus', 'ai-flavor-hunter', 'logic-auditor'],
      twist: 120,
    },
    { rounds: 2, chapterWords: 2500, scanThreshold: 70, autoChart: true, autoHelp: true },
  )
  assert.equal(settings.rounds, 4)
  assert.equal(settings.chapterWords, 800)
  assert.equal(settings.scanThreshold, 95)
  assert.equal(settings.autoChart, true)
  assert.equal(settings.outputMode, 'chat')
  assert.equal(settings.autoPopup, false)
  assert.equal(settings.outputDir, 'out/txt')
  assert.equal(settings.panelTheme, 'auto')
  assert.equal(settings.twist, 100)
  assert.deepEqual(settings.selectedRoles, ['ai-flavor-hunter', 'logic-auditor'])
})

test('routes are created with exact paths', () => {
  const routes = createRoutes({
    state: async () => ({}),
    charts: async () => ({}),
    output: async () => ({}),
    hooks: () => ({}),
    discard: async () => ({ deleted: false }),
    activate: async () => ({ delivered: false }),
    settings: () => ({}),
    roles: () => [],
  })
  assert.equal(routes.length, 8)
  assert.ok(routes.every((route) => route.kind === 'exact'))
  assert.deepEqual(routes.map((route) => route.path).sort(), [
    '/novel-studio/activate',
    '/novel-studio/charts',
    '/novel-studio/discard',
    '/novel-studio/hooks',
    '/novel-studio/output',
    '/novel-studio/roles',
    '/novel-studio/settings',
    '/novel-studio/state',
  ])
})
