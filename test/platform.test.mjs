import { test } from 'node:test'
import assert from 'node:assert/strict'
import { platformBlock, platformRoleHint, platformSummary, platformGuide } from '../lib/platform.js'

test('each platform block carries its own direction', () => {
  const tomato = platformBlock({ platform: '番茄' })
  assert.ok(tomato.includes('## 平台风向：番茄'))
  assert.ok(tomato.includes('开篇 300 字'))
  assert.ok(tomato.includes('800–1200'))

  const qidian = platformBlock({ platform: '起点' })
  assert.ok(qidian.includes('力量/等级/规则体系自洽'))
  assert.ok(qidian.includes('付费章'))

  const jinjiang = platformBlock({ platform: '晋江' })
  assert.ok(jinjiang.includes('人物关系与情感张力'))
  assert.ok(jinjiang.includes('雷点'))

  const zhihu = platformBlock({ platform: '知乎盐选' })
  assert.ok(zhihu.includes('一句话钩子'))
  assert.ok(zhihu.includes('前三段'))

  const literary = platformBlock({ platform: '纯文学' })
  assert.ok(literary.includes('留白'))
  assert.ok(literary.includes('不套网文章末钩子'))
})

test('empty platform produces no block; unknown platform uses the generic guide', () => {
  assert.equal(platformBlock({ platform: '' }), '')
  const custom = platformBlock({ platform: '豆瓣阅读' })
  assert.ok(custom.includes('暂不指定（通用）'))
})

test('saved guidance appears and is clamped', () => {
  const block = platformBlock({
    platform: '番茄',
    platformGuidance: ['开篇必须死人', '每章留一个未解问题', 'x'.repeat(300)],
  })
  assert.ok(block.includes('开篇必须死人'))
  assert.ok(block.includes('每章留一个未解问题'))
  assert.ok(block.includes('当前风向'))
  assert.ok(!block.includes('x'.repeat(130)))
})

test('role hints are platform-specific', () => {
  assert.ok(platformRoleHint({ id: 'hook-pace-inspector' }, '番茄').includes('800–1200'))
  assert.ok(platformRoleHint({ id: 'logic-auditor' }, '起点').includes('吃书'))
  assert.equal(platformRoleHint({ id: 'hook-pace-inspector' }, '纯文学'), '')
  assert.equal(platformRoleHint({ id: 'senior-editor' }, '番茄'), '')
})

test('summary exposes the guide for the panel', () => {
  const summary = platformSummary('番茄')
  assert.equal(summary.platform, '番茄')
  assert.ok(summary.label.includes('番茄'))
  assert.ok(summary.writing.length > 0)
  assert.ok(platformGuide('不存在').label.includes('通用'))
})
