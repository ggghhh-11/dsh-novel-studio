import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nextStep, formatStatus, parseRange, batchOutlineFile, chapterFileName,
  chapterOutlineFileName, STAGE_LABELS, outputFileName, resolveOutputFile, resolveOutputDir,
} from '../lib/pipeline.js'
import { newProject } from '../lib/store.js'

test('stage labels exist', () => {
  for (const stage of ['brief', 'outline', 'chapter_outline', 'draft', 'review', 'done']) {
    assert.ok(STAGE_LABELS[stage])
  }
})

test('next step follows the pipeline', () => {
  const fresh = newProject({ title: 'x' })
  assert.equal(nextStep(fresh).action, 'brief')
  fresh.answers = { A1: ['朴素'] }
  fresh.stage = 'outline'
  assert.equal(nextStep(fresh).action, 'outline')
  fresh.stage = 'chapter_outline'
  assert.equal(nextStep(fresh).action, 'chapter_outline')
  fresh.stage = 'draft'
  assert.equal(nextStep(fresh).action, 'draft')
  fresh.stage = 'review'
  assert.equal(nextStep(fresh).action, 'review_plan')
  fresh.stage = 'done'
  assert.equal(nextStep(fresh).action, 'status')
})

test('chapter file naming', () => {
  assert.equal(chapterFileName(1), 'ch001.md')
  assert.equal(chapterFileName(123), 'ch123.md')
  assert.equal(chapterOutlineFileName(7), 'ch007.outline.md')
  assert.equal(batchOutlineFile(1, 10), 'ch001-010.outline.md')
  assert.equal(batchOutlineFile(3, 1), 'ch003.outline.md')
})

test('parse range', () => {
  assert.deepEqual(parseRange(5, 3), { from: 5, count: 3, to: 7 })
  assert.deepEqual(parseRange(0, 0), { from: 1, count: 3, to: 3 })
})

test('status text is human readable', () => {
  const project = newProject({ title: '测试', answers: { A1: ['朴素'] }, chapterWords: 2600, rounds: 2 })
  project.stage = 'draft'
  const text = formatStatus(project)
  assert.ok(text.includes('测试'))
  assert.ok(text.includes('2600'))
  assert.ok(text.includes('下一步'))
})

test('TXT output naming', () => {
  assert.equal(outputFileName('outline'), '大纲.txt')
  assert.equal(outputFileName('chapter_outline', { from: 1, count: 10 }), '第001-010章-章纲.txt')
  assert.equal(outputFileName('chapter_outline', { from: 7, count: 1 }), '第007章-章纲.txt')
  assert.equal(outputFileName('draft', { chapter: 3 }), '第003章.txt')
  assert.equal(outputFileName('draft', { chapter: 3, count: 2 }), '第003-004章.txt')
})

test('custom output directory stays inside the workspace', () => {
  const cwd = process.cwd()
  const project = newProject({ title: 'x' })
  project.outputDir = 'exports/novel'
  const dir = resolveOutputDir(cwd, { dir: cwd }, project)
  assert.ok(dir.startsWith(cwd))
  assert.ok(dir.endsWith('exports\\novel') || dir.endsWith('exports/novel'))
  project.outputDir = '../escape'
  assert.throws(() => resolveOutputDir(cwd, { dir: cwd }, project))
  assert.ok(resolveOutputFile(cwd, { dir: cwd }, newProject({ title: 'x' }), 'outline').endsWith('大纲.txt'))
})
