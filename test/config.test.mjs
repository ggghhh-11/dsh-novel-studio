import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeConfig, DEFAULT_CONFIG, clampChapterWords, clampRounds, clampChapterCount, clampDraftCount } from '../lib/config.js'

test('defaults when config is empty', () => {
  const { config, warnings } = normalizeConfig({})
  assert.deepEqual(config, DEFAULT_CONFIG)
  assert.equal(warnings.length, 0)
})

test('clamps unsafe values', () => {
  const { config, warnings } = normalizeConfig({
    defaultRounds: 99,
    scanThreshold: 10,
    maxChaptersPerOutline: 10000,
    roleSet: 'nope',
    projectDir: '../escape',
    language: 'fr',
  })
  assert.equal(config.defaultRounds, 4)
  assert.equal(config.scanThreshold, 50)
  assert.equal(config.maxChaptersPerOutline, 500)
  assert.equal(config.roleSet, 'standard')
  assert.equal(config.projectDir, 'novel')
  assert.equal(config.language, 'zh')
  assert.ok(warnings.length >= 2)
})

test('per-call clamps', () => {
  assert.equal(clampChapterWords(100, 2500), 800)
  assert.equal(clampChapterWords(99999, 2500), 8000)
  assert.equal(clampRounds(-1, 2), 0)
  assert.equal(clampRounds(9, 2), 4)
  assert.equal(clampChapterCount(50, 3, 20), 20)
  assert.equal(clampChapterCount(300, 3, 500), 300)
  assert.equal(clampChapterCount(0, 3, 500), 1)
  assert.equal(clampDraftCount(99, 1), 3)
})
