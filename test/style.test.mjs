import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  diffTexts, deriveTraits, styleBlock, learnFromRevision, readStyleMemory,
  clearStyleMemory, setStyleEnabled, splitParagraphs, splitSentences,
} from '../lib/style.js'

function profile() {
  process.env.DSH_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-style-'))
}

const ORIGINAL = [
  '他走进房间的时候，忽然看见桌上有一封信。信纸微微发黄，仿佛已经放了很久。',
  '他不禁愣了一下，随即走过去拆开信，读了一遍。窗外的雨还在下，屋檐滴水的声音很轻。',
  '他把信放回桌上，转身离开。走到门口的时候，他停了一下，又继续往前走。',
].join('\n\n')

const REVISED = [
  '他推门进去。桌上有一封信。信纸发黄。',
  '他愣了一下，走过去拆开信，读了两遍。窗外的雨还在下。屋檐在滴水。',
  '他把信放回去，转身离开。走到门口，他停了一下，又往前走。',
  '走廊里没有人，灯也没有开。他摸黑下了楼，听见自己的脚步声。雨声从门口传进来，他把衣领竖起来，走进雨里。',
].join('\n\n')

test('splits paragraphs and sentences', () => {
  assert.deepEqual(splitParagraphs('a\n\nb\nc'), ['a', 'b', 'c'])
  assert.deepEqual(splitSentences('他走了。她笑了！'), ['他走了。', '她笑了！'])
})

test('diff reports shorter sentences and removed AI phrases', () => {
  const diff = diffTexts(ORIGINAL, REVISED)
  assert.ok(diff.stats.changes > 0)
  assert.ok(diff.stats.avgSentenceAfter < diff.stats.avgSentenceBefore)
  assert.ok(diff.stats.removedBanned.length >= 2)
  assert.ok(diff.stats.changeRatio > 0)
})

test('derives readable traits', () => {
  const diff = diffTexts(ORIGINAL, REVISED)
  const traits = deriveTraits(diff, 'evidence')
  assert.ok(traits.some((trait) => trait.text.includes('短句')))
  assert.ok(traits.some((trait) => trait.text.includes('套话')))
})

test('learns from a revision and de-duplicates', () => {
  profile()
  const result = learnFromRevision({ original: ORIGINAL, revised: REVISED, meta: { projectSlug: 'x', chapter: 1 } })
  assert.equal(result.duplicate, false)
  assert.ok(result.traits.length >= 2)
  const memory = readStyleMemory()
  assert.ok(memory.traits.length >= 2)
  assert.equal(memory.samples.length, 1)
  const again = learnFromRevision({ original: ORIGINAL, revised: REVISED })
  assert.equal(again.duplicate, true)
  assert.equal(readStyleMemory().samples.length, 1)
})

test('identical text is reported as unchanged and not stored', () => {
  profile()
  const same = learnFromRevision({ original: ORIGINAL, revised: ORIGINAL })
  assert.equal(same.unchanged, true)
  assert.equal(readStyleMemory().samples.length, 0)
})

test('rejects a too-short revision', () => {
  profile()
  assert.throws(
    () => learnFromRevision({ original: ORIGINAL, revised: '太短了' }),
    /太短/,
  )
})

test('styleBlock renders and respects the switch', () => {
  profile()
  assert.equal(styleBlock(), '')
  const memory = {
    enabled: true,
    traits: [{ text: '偏好短句', hits: 2 }],
    vocab: [{ from: '说道', to: '开口', count: 1 }],
  }
  const block = styleBlock(memory)
  assert.ok(block.includes('作者风格记忆'))
  assert.ok(block.includes('说道 → 开口'))
  assert.equal(styleBlock({ ...memory, enabled: false }), '')
})

test('toggle and clear update the memory', () => {
  profile()
  setStyleEnabled(false)
  assert.equal(readStyleMemory().enabled, false)
  setStyleEnabled(true)
  assert.equal(readStyleMemory().enabled, true)
  clearStyleMemory()
  assert.equal(readStyleMemory().samples.length, 0)
})
