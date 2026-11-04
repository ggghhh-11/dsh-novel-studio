import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectCreationIntent, lastHumanText, hasHumanMessage, answerMeansEnable, isManualEnableText } from '../lib/intent.js'

test('detects direct creation intent', () => {
  assert.equal(detectCreationIntent('我想写小说').matched, true)
  assert.equal(detectCreationIntent('帮我写一部科幻小说').matched, true)
  assert.equal(detectCreationIntent('想写个故事').matched, true)
  assert.equal(detectCreationIntent('开个新坑').matched, true)
  assert.equal(detectCreationIntent('我想写一部关于记忆研究的小说').matched, true)
})

test('rejects developer and research context', () => {
  assert.equal(detectCreationIntent('我想写小说插件').matched, false)
  assert.equal(detectCreationIntent('怎么开发小说功能').matched, false)
  assert.equal(detectCreationIntent('分析这本小说').matched, false)
  assert.equal(detectCreationIntent('点评一下这部小说的结构').matched, false)
  assert.equal(detectCreationIntent('').matched, false)
})

test('rejects over-long text', () => {
  assert.equal(detectCreationIntent(`我想写小说${'啊'.repeat(600)}`).matched, false)
})

test('extracts the last human text from a batch', () => {
  const messages = [
    { role: 'user', source: { kind: 'runtime-context' }, content: [{ type: 'text', text: 'runtime' }] },
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '第一句' }] },
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '我想写小说' }] },
  ]
  assert.equal(lastHumanText(messages), '我想写小说')
  assert.equal(hasHumanMessage(messages), true)
  assert.equal(hasHumanMessage([]), false)
})

test('interprets enable answers', () => {
  assert.equal(answerMeansEnable({ answers: [{ selected: ['启用'] }] }), true)
  assert.equal(answerMeansEnable({ answers: [{ selected: ['暂不启用'] }] }), false)
  assert.equal(answerMeansEnable({ answers: [{ selected: [], custom: '好的，开始吧' }] }), true)
  assert.equal(answerMeansEnable({ answers: [{ selected: [], custom: '先不要' }] }), false)
  assert.equal(answerMeansEnable(null), false)
})

test('manual enable text', () => {
  assert.equal(isManualEnableText('启用小说工作台'), true)
  assert.equal(isManualEnableText('今天天气不错'), false)
})
