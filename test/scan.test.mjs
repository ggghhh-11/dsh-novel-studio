import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanText, summarizeScan, scanGate, BANNED_PHRASES } from '../lib/scan.js'

const CLEAN = [
  '他把碗放回桌上，指节敲了两下。',
  '窗外下着雨。她没有抬头。',
  '"你走的时候，伞留下。"',
  '他说好。声音很轻。',
  '楼道里的灯坏了三天，没人修。',
].join('\n\n')

const FLAVORED = [
  '他不禁微微一笑，嘴角微微上扬，仿佛整个世界都明亮了起来。',
  '空气中弥漫着一股说不清的味道，他心中五味杂陈，涌上心头。',
  '与此同时，他感到一阵莫名的悲伤，若有所思地看着远方。',
  '总而言之，这一切都像是一场梦，直到这一刻他才恍然大悟。',
  '她深吸一口气，缓缓开口，眼神复杂，意味深长。',
].join('\n\n')

test('empty text is safe', () => {
  const result = scanText('')
  assert.equal(result.chars, 0)
  assert.equal(result.score, 100)
  assert.equal(Array.isArray(result.banned), true)
})

test('clean prose scores higher than flavored prose', () => {
  const clean = scanText(CLEAN)
  const flavored = scanText(FLAVORED)
  assert.ok(clean.score > flavored.score, `${clean.score} should beat ${flavored.score}`)
  assert.ok(flavored.banned.length > 0)
  assert.ok(flavored.mustRewrite.length > 0)
})

test('banned hits carry lines', () => {
  const result = scanText(FLAVORED)
  const hit = result.banned.find((item) => item.phrase === '不禁')
  assert.ok(hit)
  assert.equal(hit.lines[0], 1)
})

test('length delta and target words', () => {
  const result = scanText('一二三四五六七八九十', { targetWords: 5 })
  assert.equal(result.wordDelta, 100)
})

test('summarize and gate', () => {
  const result = scanText(FLAVORED)
  assert.ok(summarizeScan(result).includes('AI 味'))
  assert.ok(scanGate(result, 90).length > 0)
  assert.equal(scanGate(scanText(CLEAN), 50).length, 0)
  assert.ok(BANNED_PHRASES.length > 20)
})

test('long sentences are measured', () => {
  const long = `${'他走进那间堆满旧报纸和破损家具的屋子，'.repeat(6)}然后坐下。`
  const result = scanText(long)
  assert.ok(result.longRatio > 0)
  assert.ok(result.suggestions.length > 0)
})
