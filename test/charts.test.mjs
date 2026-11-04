import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeChartData, chartSummary, hasChartData, emptyChartData } from '../lib/charts.js'

test('normalizes and clamps chart data', () => {
  const data = normalizeChartData({
    title: '书',
    chapters: [{ no: 2, title: '二', tension: 150, hook: -5, words: 3000 }, { no: 1, title: '一', tension: 40, hook: 80 }],
    characters: [{ id: 'a', name: '甲', role: '主角' }, { name: '乙' }],
    relations: [{ from: 'a', to: '乙', label: '师徒', strength: 9 }, { from: 'a', to: '不存在', label: 'x' }],
    metrics: [{ round: 1, aiScore: 60, readability: 70 }],
  }, { title: '默认' })
  assert.deepEqual(data.chapters.map((item) => item.no), [1, 2])
  assert.equal(data.chapters[1].tension, 100)
  assert.equal(data.chapters[1].hook, 0)
  assert.equal(data.relations.length, 1)
  assert.equal(data.relations[0].strength, 5)
  assert.equal(data.characters.length, 2)
  assert.ok(data.summary.length > 0)
})

test('drops invalid entries', () => {
  const data = normalizeChartData({ chapters: [{ no: 0 }, { no: 'x' }, null], characters: [null, { name: '' }] })
  assert.equal(data.chapters.length, 0)
  assert.equal(data.characters.length, 0)
  assert.equal(hasChartData(data), false)
})

test('summary mentions peaks and low tension', () => {
  const data = normalizeChartData({
    chapters: [
      { no: 1, tension: 20, hook: 30 },
      { no: 2, tension: 90, hook: 95 },
      { no: 3, tension: 10, hook: 20 },
    ],
  })
  const summary = chartSummary(data)
  assert.ok(summary.includes('第 2 章'))
})

test('empty payload has a friendly summary', () => {
  const data = emptyChartData()
  assert.equal(hasChartData(data), false)
  assert.ok(data.summary.includes('还没有'))
})
