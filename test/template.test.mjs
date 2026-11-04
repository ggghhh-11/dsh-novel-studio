import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SECTIONS, renderTemplate, renderChoiceCard, applyRoutes, mergeAnswers,
  detectConflicts, formatAnswers, ROUTES,
} from '../lib/template.js'

test('template keeps author-decidable sections and drops research ones', () => {
  const ids = SECTIONS.map((section) => section.id)
  for (const kept of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'O']) {
    assert.ok(ids.includes(kept), `missing section ${kept}`)
  }
  for (const dropped of ['L', 'M', 'N']) {
    assert.ok(!ids.includes(dropped), `section ${dropped} should be removed`)
  }
})

test('template rendering', () => {
  const compact = renderTemplate({ full: false })
  const full = renderTemplate({ full: true })
  assert.ok(compact.includes('A1 语言风格'))
  assert.ok(full.length > compact.length)
  assert.ok(full.includes('O8 伦理价值'))
  assert.ok(compact.includes('作者生平'))
})

test('choice card lists routes and numbered dimensions', () => {
  const card = renderChoiceCard({ chapterWords: 3000, rounds: 2 })
  assert.ok(card.includes(ROUTES[0].label))
  assert.ok(card.includes('A1 语言风格'))
  assert.ok(card.includes('每章字数：3000'))
})

test('routes merge', () => {
  const result = applyRoutes(['1', '3'])
  assert.equal(result.applied.length, 2)
  assert.equal(result.answers.genre, '玄幻修仙')
})

test('mergeAnswers does not mutate and accumulates arrays', () => {
  const base = { A1: ['朴素'] }
  const merged = mergeAnswers(base, { A1: ['冷峻'], B1: '第三人称限知' })
  assert.deepEqual(merged.A1, ['朴素', '冷峻'])
  assert.equal(base.A1.length, 1)
})

test('conflict detection', () => {
  const conflicts = detectConflicts({ pov: '第一人称+全知', platform: '纯文学', genre: '玄幻', length: '短篇', chapterWords: 7000 })
  assert.ok(conflicts.length >= 2)
  assert.equal(detectConflicts({ pov: '第三人称限知', platform: '起点', genre: '玄幻', length: '长篇连载', chapterWords: 2500 }).length, 0)
})

test('answer formatting', () => {
  assert.ok(formatAnswers({ A1: ['朴素'], round: 2 }).includes('朴素'))
  assert.equal(formatAnswers(null), '')
})
