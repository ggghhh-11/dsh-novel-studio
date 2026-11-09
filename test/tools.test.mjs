import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createStudioTools } from '../lib/tools.js'
import { normalizeConfig } from '../lib/config.js'
import { readRuntime } from '../lib/store.js'

// Keep runtime state (checkpoint/settings) inside a throwaway profile.
process.env.DSH_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-runtime-'))

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ns-tools-'))
}

function fakeContext() {
  return {
    get(name) {
      if (name === 'tools') return undefined
      if (name === 'workingDirectory') return undefined
      return undefined
    },
  }
}

function execFor(cwd) {
  return {
    agent: { id: 'test', session: { id: 'test-session', header: { cwd } } },
    signal: new AbortController().signal,
  }
}

function makeTools() {
  const { config } = normalizeConfig({})
  const ctx = fakeContext()
  return createStudioTools({ ctx, config })
}

test('template action works', async () => {
  const { studio } = makeTools()
  const result = await studio.execute({ action: 'template' }, execFor(tempDir()))
  assert.equal(result.ok, true)
  assert.ok(result.message.includes('A1 语言风格'))
  const full = await studio.execute({ action: 'template', full: true }, execFor(tempDir()))
  assert.ok(full.message.includes('O8 伦理价值'))
})

test('start -> brief -> chapter_outline -> draft -> review_plan -> chart', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)

  const started = await studio.execute({ action: 'start', title: '测试小说' }, exec)
  assert.equal(started.ok, true)
  assert.ok(fs.existsSync(path.join(cwd, 'novel')))
  assert.equal(fs.readdirSync(path.join(cwd, 'novel')).length, 1)

  const brief = await studio.execute({
    action: 'brief',
    route: '1',
    answers: { A1: ['朴素'], chapterWords: 2600, pov: '第一人称限知' },
  }, exec)
  assert.equal(brief.ok, true)

  const outlines = await studio.execute({ action: 'chapter_outline', from: 1, count: 10 }, exec)
  assert.equal(outlines.data.count, 10)
  assert.ok(outlines.data.file.includes('第001-010章-章纲.txt'))

  const draft = await studio.execute({ action: 'draft', chapter: 1, chapterWords: 2600 }, exec)
  assert.equal(draft.ok, true)
  assert.ok(draft.data.files[0].endsWith('第001章.txt'))

  const plan = await studio.execute({ action: 'review_plan', target: 'draft', round: 1, rounds: 2 }, exec)
  assert.equal(plan.ok, true)
  assert.ok(Array.isArray(plan.data.reviewers))
  assert.ok(plan.data.reviewers.length >= 4)
  assert.ok(plan.data.reviewers.some((item) => item.id === 'flow-readability-auditor'))
  assert.ok(plan.data.workflowScript.includes('parallel('))
  assert.ok(plan.data.workflowScript.includes('args'))

  const chart = await studio.execute({
    action: 'chart',
    chart: {
      chapters: [{ no: 1, title: '一', tension: 60, hook: 80, words: 2600 }],
      characters: [{ id: 'a', name: '甲', role: '主角' }, { id: 'b', name: '乙', role: '配角' }],
      relations: [{ from: 'a', to: 'b', label: '师徒', strength: 3 }],
    },
  }, exec)
  assert.equal(chart.ok, true)
  assert.ok(chart.message.includes('故事图谱已更新'))

  const record = await studio.execute({
    action: 'record', round: 1, target: 'draft', findings: 3, accepted: ['删掉套话'],
    scan: { score: 75, readability: 80 },
  }, exec)
  assert.equal(record.ok, true)

  const status = await studio.execute({ action: 'status' }, exec)
  assert.equal(status.ok, true)
  assert.ok(status.message.includes('测试小说'))
})

test('scan tool reads a file inside the workspace', async () => {
  const cwd = tempDir()
  const { scan } = makeTools()
  const file = path.join(cwd, 'sample.md')
  fs.writeFileSync(file, '他不禁微微一笑，仿佛一切都没变。', 'utf8')
  const result = await scan.execute({ file: 'sample.md', targetWords: 100 }, execFor(cwd))
  assert.equal(result.ok, true)
  assert.ok(result.message.includes('扫描结果'))
  assert.ok(result.data.banned.length > 0)
})

test('scan rejects paths outside the workspace', async () => {
  const cwd = tempDir()
  const { scan } = makeTools()
  await assert.rejects(() => scan.execute({ file: '../outside.md' }, execFor(cwd)))
})

test('scan flags telegraphic prose as a suggestion, not a forced rewrite', async () => {
  const cwd = tempDir()
  const { scan } = makeTools()
  const text = Array.from({ length: 80 }, (_, i) => `早上八点。公司只有我。复印机预热。第${i}天。`).join('\n\n')
  const result = await scan.execute({ text }, execFor(cwd))
  assert.equal(result.data.overBrief, true)
  assert.ok(result.data.suggestions.some((line) => line.includes('提纲') || line.includes('场景')))
  assert.ok(!result.data.mustRewrite.some((line) => line.includes('电报体')))
})

test('status on an empty workspace guides instead of creating', async () => {
  process.env.DSH_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-empty-'))
  const cwd = tempDir()
  const { studio } = makeTools()
  const result = await studio.execute({ action: 'status' }, execFor(cwd))
  assert.equal(result.ok, true)
  assert.ok(result.message.includes('还没有小说项目'))
  assert.equal(fs.existsSync(path.join(cwd, 'novel')), false)
})

test('output_done registers a TXT file and bumps the output version', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '输出测试', outputDir: '我的输出', outputMode: 'file' }, exec)
  const outline = await studio.execute({ action: 'outline' }, exec)
  assert.ok(outline.data.file.includes('我的输出'))
  assert.ok(outline.data.file.endsWith('大纲.txt'))
  fs.writeFileSync(outline.data.file, '第一幕：主角失去工作。\n第二幕：他决定写小说。\n', 'utf8')

  const done = await studio.execute({ action: 'output_done', kind: 'outline', file: outline.data.file }, exec)
  assert.equal(done.ok, true)
  assert.equal(done.data.version, 1)
  assert.ok(fs.existsSync(path.join(cwd, '我的输出', '大纲.txt')))

  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const raw = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8'))
  assert.equal(raw.outputVersion, 1)
  assert.equal(raw.outputs.length, 1)
  assert.equal(raw.outputMode, 'file')
  assert.equal(raw.outputDir, '我的输出')
  const checkpoint = readRuntime().checkpoint
  assert.equal(checkpoint?.sessionId, 'test-session')
})

test('output_done rejects empty files and paths outside the workspace', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: 'x' }, exec)
  const outside = await studio.execute({ action: 'output_done', kind: 'draft', file: '../escape.txt' }, exec).catch((error) => ({ ok: false, error }))
  assert.equal(outside.ok, false)
  const empty = await studio.execute({ action: 'output_done', kind: 'draft', file: 'missing.txt' }, exec)
  assert.equal(empty.ok, true)
  assert.ok(empty.message.includes('不存在或为空'))
})

test('hooks, twist, custom review, checkpoint, resume and discard', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '钩子书', twist: 90 }, exec)
  await studio.execute({ action: 'brief', answers: { genre: '悬疑' }, twist: 90 }, exec)

  const hooks = await studio.execute({
    action: 'hooks',
    hooks: [{ chapter: 1, title: '门里的声音', type: '悬念', text: '半夜有人敲门' }],
  }, exec)
  assert.equal(hooks.ok, true)
  assert.equal(hooks.data.open, 1)

  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const raw = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8'))
  assert.equal(raw.hooks.length, 1)
  assert.equal(raw.twist, 90)

  const resolved = await studio.execute({ action: 'hooks', resolved: [raw.hooks[0].id] }, exec)
  assert.equal(resolved.data.open, 0)

  const custom = await studio.execute({ action: 'custom_review', issue: '对话太干' }, exec)
  assert.equal(custom.ok, true)
  assert.ok(custom.message.includes('专项修改顾问'))

  const checkpoint = await studio.execute({ action: 'checkpoint' }, exec)
  assert.equal(checkpoint.ok, true)
  assert.ok(fs.existsSync(path.join(projectDir, 'checkpoint.json')))

  const resume = await studio.execute({ action: 'resume' }, exec)
  assert.equal(resume.ok, true)
  assert.equal(typeof resume.data.withinWindow, 'boolean')
  assert.ok(Array.isArray(resume.data.options))
  assert.ok(resume.data.options.length >= 4)

  const discardNo = await studio.execute({ action: 'discard' }, exec)
  assert.equal(discardNo.data.requiresConfirm, true)
  const discard = await studio.execute({ action: 'discard', confirm: true }, exec)
  assert.equal(discard.ok, true)
  assert.equal(fs.existsSync(projectDir), false)
})

test('platform_scan records the platform and returns a trend-analyst prompt', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '平台书', platform: '番茄' }, exec)
  const scan = await studio.execute({ action: 'platform_scan', platform: '番茄' }, exec)
  assert.equal(scan.ok, true)
  assert.equal(scan.data.platform, '番茄')
  assert.ok(scan.data.subagentPrompt.includes('平台趋势分析师'))
  assert.ok(scan.data.askUser.includes('子智能体'))
  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const raw = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8'))
  assert.equal(raw.platform, '番茄')
})

const STYLE_ORIGINAL = [
  '他走进房间的时候，忽然看见桌上有一封信。信纸微微发黄，仿佛已经放了很久。',
  '他不禁愣了一下，随即走过去拆开信，读了一遍。窗外的雨还在下，屋檐滴水的声音很轻。',
  '他把信放回桌上，转身离开。走到门口的时候，他停了一下，又继续往前走。',
].join('\n\n')

const STYLE_REVISED = [
  '他推门进去。桌上有一封信。信纸发黄。',
  '他愣了一下，走过去拆开信，读了两遍。窗外的雨还在下。屋檐在滴水。',
  '他把信放回去，转身离开。走到门口，他停了一下，又往前走。',
  '走廊里没有人，灯也没有开。他摸黑下了楼，听见自己的脚步声。雨声从门口传进来，他把衣领竖起来，走进雨里。',
].join('\n\n')

test('output_done keeps a version backup', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '备份测试' }, exec)
  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const file = path.join(projectDir, '第001章.txt')
  fs.writeFileSync(file, '正文内容。'.repeat(30), 'utf8')
  const done = await studio.execute({ action: 'output_done', kind: 'draft', file }, exec)
  assert.equal(done.ok, true)
  const versions = fs.readdirSync(path.join(projectDir, 'versions'))
  assert.ok(versions.some((name) => name.startsWith('第001章.txt.')))
})

test('learn_style stores traits and injects them into draft', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '风格书' }, exec)
  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const originalPath = path.join(projectDir, 'original.txt')
  fs.writeFileSync(originalPath, STYLE_ORIGINAL, 'utf8')
  const learned = await studio.execute({
    action: 'learn_style',
    originalPath,
    revised: STYLE_REVISED,
    chapter: 2,
    label: '用户改稿',
  }, exec)
  assert.equal(learned.ok, true)
  assert.ok(learned.data.stats.changes > 0)
  assert.ok(Array.isArray(learned.data.traits))
  assert.ok(learned.data.traits.length >= 1)
  const listed = await studio.execute({ action: 'style' }, exec)
  assert.ok(listed.data.memory.traits.length >= 1)
  const draft = await studio.execute({ action: 'draft', chapter: 2 }, exec)
  assert.ok(draft.message.includes('作者风格记忆'))
  const cleared = await studio.execute({ action: 'style', clear: true }, exec)
  assert.equal(cleared.ok, true)
  assert.equal(cleared.data.cleared, true)
})

test('platform direction is injected into draft and review prompts', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '番茄书', platform: '番茄' }, exec)
  const draft = await studio.execute({ action: 'draft', chapter: 1 }, exec)
  assert.ok(draft.message.includes('## 平台风向：番茄'))
  assert.ok(draft.message.includes('开篇 300 字'))

  const saved = await studio.execute({
    action: 'platform_brief',
    guidance: ['开篇必须死人', '每章留一个未解问题'],
  }, exec)
  assert.equal(saved.ok, true)
  assert.equal(saved.data.guidance.length, 2)
  const draft2 = await studio.execute({ action: 'draft', chapter: 2 }, exec)
  assert.ok(draft2.message.includes('开篇必须死人'))
  assert.ok(draft2.message.includes('每章留一个未解问题'))

  const plan = await studio.execute({ action: 'review_plan' }, exec)
  assert.ok(plan.data.reviewers[0].prompt.includes('## 平台风向：番茄'))
  assert.ok(plan.data.reviewers.some((reviewer) => reviewer.id === 'hook-pace-inspector' && reviewer.prompt.includes('800–1200')))

  const switched = await studio.execute({ action: 'start', title: '番茄书', platform: '起点' }, exec)
  assert.equal(switched.ok, true)
  const draft3 = await studio.execute({ action: 'draft', chapter: 3 }, exec)
  assert.ok(draft3.message.includes('## 平台风向：起点'))
  assert.ok(!draft3.message.includes('开篇必须死人'))

  const cleared = await studio.execute({ action: 'platform_brief', clear: true }, exec)
  assert.equal(cleared.ok, true)
  assert.deepEqual(cleared.data.guidance, [])
})

test('brief asks what to generate instead of returning the outline instruction', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '确认测试' }, exec)
  const brief = await studio.execute({ action: 'brief', answers: { genre: '悬疑' } }, exec)
  assert.equal(brief.ok, true)
  assert.equal(brief.data.askNext, true)
  assert.ok(Array.isArray(brief.data.nextChoices))
  assert.ok(brief.message.includes('先问用户'))
  assert.ok(!brief.message.includes('## 落盘'))

  const next = await studio.execute({ action: 'next' }, exec)
  assert.ok(Array.isArray(next.data.options))
  assert.ok(next.data.options.some((item) => item.id === 'draft'))

  const draftNoChapter = await studio.execute({ action: 'draft' }, exec)
  assert.equal(draftNoChapter.data.askChapter, true)
})

test('review_plan reports 11/32 and debate_plan renders a cross-examination script', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '审稿测试' }, exec)
  await studio.execute({ action: 'brief', answers: { genre: '悬疑' } }, exec)

  const plan = await studio.execute({ action: 'review_plan', target: 'draft', round: 1 }, exec)
  assert.equal(plan.data.totalRoles, 32)
  assert.equal(plan.data.roleCount, 11)
  assert.ok(plan.message.includes('11/32'))

  const debate = await studio.execute({
    action: 'debate_plan',
    disputes: [{
      id: 'd1',
      issue: '节奏太快还是太慢',
      positions: [
        { role: 'hook-pace-inspector', stance: '太快', evidence: '第一章' },
        { role: 'reader-experience-officer', stance: '铺垫不足', evidence: '第一章' },
      ],
      decision: { verdict: 'partial', reason: '保留但补一句' },
    }],
  }, exec)
  assert.equal(debate.ok, true)
  assert.equal(debate.data.disputes.length, 1)
  assert.ok(debate.data.workflowScript.includes('parallel('))
  assert.ok(debate.data.workflowScript.includes('裁决主持'))
})

test('record stores final decisions', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '裁决测试' }, exec)
  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const decisions = [{ issue: '节奏', role: 'hook-pace-inspector', verdict: 'reject', reason: '会破坏伏笔', outcome: '保留' }]
  const recorded = await studio.execute({ action: 'record', round: 1, target: 'draft', findings: 1, decisions }, exec)
  assert.equal(recorded.ok, true)
  const raw = JSON.parse(fs.readFileSync(path.join(projectDir, 'reviews', 'round-1-draft.json'), 'utf8'))
  assert.equal(raw.decisions.length, 1)
  assert.equal(raw.decisions[0].verdict, 'reject')
})

test('revision_impact builds an outline-impact task', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '影响测试' }, exec)
  await studio.execute({ action: 'outline_apply', outlineText: '# 大纲\n主角从废物成长为管理员。' }, exec)
  const result = await studio.execute({
    action: 'revision_impact',
    original: '陈默被判定为 F 级废物，进入虚拟世界。',
    revised: '陈默其实是世界管理员，进入虚拟世界后直接通关。',
    chapter: 1,
  }, exec)
  assert.equal(result.ok, true)
  assert.ok(result.data.prompt.includes('hasOutlineImpact'))
  assert.ok(result.data.prompt.includes('全书大纲'))
  assert.equal(result.data.askUser, '这次改动是否同步修改大纲？')
})

test('outline_apply saves the new outline and offers reviewer sets', async () => {
  const cwd = tempDir()
  const { studio } = makeTools()
  const exec = execFor(cwd)
  await studio.execute({ action: 'start', title: '大纲测试' }, exec)
  const projectDir = path.join(cwd, 'novel', fs.readdirSync(path.join(cwd, 'novel'))[0])
  const applied = await studio.execute({
    action: 'outline_apply',
    outlineText: '# 新大纲\n主角提前揭示管理员身份。',
  }, exec)
  assert.equal(applied.ok, true)
  assert.ok(fs.existsSync(path.join(projectDir, '大纲.txt')))
  assert.ok(applied.data.roleOptions.length >= 3)
  assert.ok(applied.data.roleOptions[0].roles.length > 0)
  const plan = await studio.execute({
    action: 'review_plan',
    target: 'outline',
    roles: applied.data.roleOptions[0].roles,
  }, exec)
  assert.equal(plan.ok, true)
  assert.ok(plan.data.reviewers.length >= applied.data.roleOptions[0].roles.length)
})

test('workspace switches and lists the projects of another directory', async () => {
  const first = tempDir()
  const second = tempDir()
  const { studio } = makeTools()
  await studio.execute({ action: 'start', title: '第一本' }, execFor(first))
  await studio.execute({ action: 'start', title: '第二本' }, execFor(second))
  const switched = await studio.execute({ action: 'workspace', workspace: second }, execFor(first))
  assert.equal(switched.ok, true)
  assert.ok(switched.data.projects.some((item) => item.title === '第二本'))
})
