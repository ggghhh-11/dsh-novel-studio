import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROLES, selectRoles, rolePrompt, targetLabel, isCommercialRole } from '../lib/roles.js'

test('the bench has 32 roles with required fields', () => {
  assert.equal(ROLES.length, 32)
  for (const role of ROLES) {
    assert.ok(role.id)
    assert.ok(role.name)
    assert.ok(role.duty)
    assert.ok(Array.isArray(role.focus) && role.focus.length >= 2)
  }
})

test('craft roles exist', () => {
  assert.ok(ROLES.some((role) => role.id === 'flow-readability-auditor'))
  assert.ok(ROLES.some((role) => role.id === 'ai-flavor-hunter'))
})

test('standard presets always include both craft roles', () => {
  for (const target of ['outline', 'chapter_outline', 'draft']) {
    const picked = selectRoles({ target, roleSet: 'standard' })
    assert.ok(picked.some((role) => role.id === 'flow-readability-auditor'))
    assert.ok(picked.some((role) => role.id === 'ai-flavor-hunter'))
  }
})

test('lean is smaller than standard, all returns everything', () => {
  const lean = selectRoles({ target: 'draft', roleSet: 'lean' })
  const standard = selectRoles({ target: 'draft', roleSet: 'standard' })
  const all = selectRoles({ target: 'draft', roleSet: 'all' })
  assert.ok(lean.length <= standard.length)
  assert.equal(all.length, 32)
})

test('literary route drops commercial-only roles', () => {
  const picked = selectRoles({ target: 'draft', roleSet: 'all', literary: true })
  assert.ok(picked.every((role) => !isCommercialRole(role)))
  assert.ok(picked.some((role) => role.id === 'ai-flavor-hunter'))
})

test('explicit role ids win', () => {
  const picked = selectRoles({ custom: ['logic-auditor'] })
  assert.ok(picked.some((role) => role.id === 'logic-auditor'))
})

test('role prompt is executable and JSON-shaped', () => {
  const role = ROLES[0]
  const prompt = rolePrompt(role, { target: 'draft', file: 'C:/tmp/ch1.md' })
  assert.ok(prompt.includes(role.name))
  assert.ok(prompt.includes('"findings"'))
  assert.ok(prompt.includes('read 工具'))
  assert.equal(targetLabel('chapter_outline'), '章纲')
})
