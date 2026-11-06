import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRevisionImpactPrompt, buildOutlineRevisionPrompt } from '../lib/revision-impact.js'

test('impact prompt compares revision against outline and hooks', () => {
  const prompt = buildRevisionImpactPrompt({
    title: '测试书',
    chapter: 3,
    original: '陈默被判定为 F 级废物。',
    revised: '陈默其实是世界管理员，直接通关。',
    outline: '主角从废物成长为管理员。',
    chapterOutline: '第3章：检测结果公布。',
    hooks: [{ chapter: 3, type: '悬念', title: '检测单被撕', status: 'open' }],
  })
  assert.ok(prompt.includes('第 3 章'))
  assert.ok(prompt.includes('hasOutlineImpact'))
  assert.ok(prompt.includes('只学习写作习惯'))
  assert.ok(prompt.includes('同步修改大纲'))
  assert.ok(prompt.includes('检测单被撕'))
  assert.ok(prompt.includes('outline_revision'))
})

test('outline revision prompt asks for a complete new outline', () => {
  const prompt = buildOutlineRevisionPrompt({
    title: '测试书',
    chapter: 3,
    outline: '旧大纲内容',
    revised: '用户改稿内容',
    impacts: { hasOutlineImpact: true, impacts: [{ type: '身份揭示' }] },
  })
  assert.ok(prompt.includes('完整的新大纲'))
  assert.ok(prompt.includes('outline_apply'))
  assert.ok(prompt.includes('本次变更'))
})
