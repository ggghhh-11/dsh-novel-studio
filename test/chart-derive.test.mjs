import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveFromTexts, mergeChartData } from '../lib/chart-derive.js'

const CHAPTERS = [
  { no: 1, text: '他推门进去。屋里没有人。桌上有一封信。信纸发黄，边角卷起。' },
  { no: 2, text: '“你来了。”她说。他点头，没有说话。“东西带来了吗？”' },
]

test('derives chapters and metrics from chapter text', () => {
  const derived = deriveFromTexts(CHAPTERS, [])
  assert.equal(derived.chapters.length, 2)
  assert.equal(derived.metrics.length, 2)
  assert.ok(derived.chapters[0].words > 0)
  assert.ok(derived.chapters[0].tension >= 0 && derived.chapters[0].tension <= 100)
  assert.ok(derived.chapters[1].hook >= 60)
  assert.equal(derived.estimated, true)
})

test('review history wins over chapter estimates', () => {
  const derived = deriveFromTexts(CHAPTERS, [{ round: 1, scan: { score: 80, readability: 90 } }])
  assert.equal(derived.metrics.length, 1)
  assert.equal(derived.metrics[0].aiScore, 80)
  assert.equal(derived.metrics[0].readability, 90)
})

test('merge keeps hand-curated data and fills gaps', () => {
  const stored = {
    chapters: [{ no: 1, title: '起', tension: 70, hook: 60, emotion: '', words: 1000 }],
    metrics: [],
    characters: [],
    relations: [],
  }
  const derived = deriveFromTexts(CHAPTERS, [])
  const merged = mergeChartData(stored, derived)
  assert.equal(merged.chapters.length, 1)
  assert.equal(merged.chapters[0].tension, 70)
  assert.equal(merged.metrics.length, 2)
  assert.equal(merged.estimated, true)
})
