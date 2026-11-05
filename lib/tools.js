/**
 * The two model-facing tools.
 *
 * `novel_studio` owns the pipeline (template, brief, outline, chapter
 * outlines, drafts, review plans, records, charts, settings) and
 * `novel_scan` owns deterministic text measurement. Both are global tools;
 * their descriptions tell the model where they may be used.
 */

import fs from 'node:fs'
import path from 'node:path'
import { clampChapterCount, clampChapterWords, clampDraftCount, clampRounds, clampTwist } from './config.js'
import { renderChoiceCard, renderTemplate, applyRoutes, mergeAnswers, detectConflicts, formatAnswers } from './template.js'
import { selectRoles, rolePrompt, describeRoles, targetLabel } from './roles.js'
import {
  outlineInstructions, chapterOutlineInstructions, draftInstructions,
  mergeInstructions, reviseInstructions,
} from './prompts.js'
import { scanText, summarizeScan } from './scan.js'
import { normalizeChartData, chartSummary } from './charts.js'
import {
  newProject, saveProject, loadProject, listProjects, projectPaths, ensureDirs,
  readText, writeTextAtomic, writeJsonAtomic, upsertChapter, slugify, readRuntime, updateRuntime,
} from './store.js'
import {
  formatStatus, nextStep, resolveProject, batchOutlineFile, parseRange, recordReview,
  chapterFileName, chapterOutlineFileName, resolveOutputFile, outputFileName, isInsideWorkspace,
} from './pipeline.js'
import { learnFromRevision, readStyleMemory, setStyleEnabled, clearStyleMemory, styleBlock, originalCandidates } from './style.js'
import { normalizePanelSettings } from './http.js'

const ACTIONS = [
  'status', 'list', 'start', 'template', 'brief', 'outline', 'chapter_outline',
  'draft', 'review_plan', 'record', 'chart', 'settings', 'output_done',
  'hooks', 'custom_review', 'resume', 'checkpoint', 'discard', 'platform_scan',
  'learn_style', 'style',
]

const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['action'],
  properties: {
    action: { type: 'string', enum: ACTIONS, description: 'The pipeline operation to perform.' },
    slug: { type: 'string', description: 'Project slug. Omit to use the most recently updated project.' },
    title: { type: 'string', description: 'Project title (start).' },
    route: { type: 'string', description: 'Route preset number or id, comma separated (e.g. "1,3" or "mystery").' },
    answers: { type: 'object', description: 'Template answers keyed by dimension (e.g. {"A1":["朴素"],"B1":"第三人称限知"}).' },
    freeform: { type: 'string', description: 'Free-form author description of the novel.' },
    outlineText: { type: 'string', description: 'A complete outline supplied by the user (brief).' },
    outlinePath: { type: 'string', description: 'Path of a user-supplied outline file inside the workspace (brief).' },
    from: { type: 'integer', description: 'First chapter number for chapter_outline.' },
    count: { type: 'integer', description: 'How many chapters (chapter_outline) or drafts (draft) to generate.' },
    chapter: { type: 'integer', description: 'Chapter number for draft.' },
    chapterWords: { type: 'integer', description: 'Target words per chapter (800–8000).' },
    totalWords: { type: 'integer', description: 'Planned total word count.' },
    totalChapters: { type: 'integer', description: 'Planned total chapter count.' },
    rounds: { type: 'integer', description: 'Review rounds (0–4).' },
    round: { type: 'integer', description: 'Current review round for review_plan/record.' },
    roleSet: { type: 'string', enum: ['lean', 'standard', 'all'], description: 'Review bench size.' },
    roles: { type: 'array', items: { type: 'string' }, description: 'Explicit reviewer ids; overrides roleSet.' },
    target: { type: 'string', enum: ['outline', 'chapter_outline', 'draft'], description: 'Review target.' },
    file: { type: 'string', description: 'File being reviewed/scanned.' },
    findings: { type: 'integer', description: 'Number of findings merged in this round (record).' },
    accepted: { type: 'array', items: { type: 'string' }, description: 'Accepted change list (record).' },
    scan: { type: 'object', description: 'Scan summary for the record: {"score":n,"readability":n}.' },
    chart: { type: 'object', description: 'Chart payload for action=chart: {chapters,characters,relations,metrics,summary}.' },
    settings: { type: 'object', description: 'Panel settings for action=settings: {rounds,chapterWords,scanThreshold,autoChart,autoHelp,outputMode,autoPopup,outputDir}.' },
    full: { type: 'boolean', description: 'Return the full template instead of the compact choice card.' },
    kind: { type: 'string', enum: ['outline', 'chapter_outline', 'draft'], description: 'What the saved TXT file contains (output_done).' },
    outputDir: { type: 'string', description: 'Custom TXT output directory inside the workspace (start/brief/settings).' },
    outputMode: { type: 'string', enum: ['file', 'chat'], description: 'file = save TXT + popup; chat = save then paste the full text into the reply.' },
    autoPopup: { type: 'boolean', description: 'Auto-open the TXT preview after saving (output_done).' },
    twist: { type: 'integer', description: 'Anti-cliche dial 0–100 (start/brief/settings); high values produce more unexpected but logical turns.' },
    hooks: { type: 'array', description: 'Hook records to add: [{chapter,title,type,text,status}] (action=hooks).' },
    resolved: { type: 'array', items: { type: 'string' }, description: 'Hook ids to mark resolved (action=hooks).' },
    issue: { type: 'string', description: 'Concrete reader/editor concern for a one-off tailored review (custom_review).' },
    confirm: { type: 'boolean', description: 'Required true to discard generated files (action=discard).' },
    note: { type: 'string', description: 'Optional note stored with a checkpoint or custom review.' },
    platform: { type: 'string', description: 'Target publishing platform (番茄/起点/晋江/知乎盐选/纯文学…), used by start and platform_scan.' },
    revised: { type: 'string', description: 'The user-edited full text of a chapter (learn_style).' },
    revisedPath: { type: 'string', description: 'Path of the user-edited TXT inside the workspace (learn_style).' },
    original: { type: 'string', description: 'Original full text, when the plugin cannot locate it (learn_style).' },
    originalPath: { type: 'string', description: 'Path of the original TXT inside the workspace (learn_style).' },
    label: { type: 'string', description: 'Optional label for the revision sample (learn_style).' },
    enabled: { type: 'boolean', description: 'Enable or disable author-style memory injection (style).' },
    clear: { type: 'boolean', description: 'Clear the author-style memory (style).' },
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'message'],
  properties: {
    ok: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: 'object' },
  },
}

function textResult(message, data) {
  return { ok: true, message, data: data ?? {} }
}

async function resolveCwd(ctx, exec) {
  const agent = exec.agent
  const wd = typeof ctx.get === 'function' ? ctx.get('workingDirectory') : undefined
  if (wd !== undefined && wd !== null && typeof wd.ensure === 'function' && agent !== undefined) {
    try {
      return await wd.ensure(agent, exec.signal)
    } catch {
      // fall through
    }
  }
  const fromSession = agent?.session?.header?.cwd
  if (typeof fromSession === 'string' && fromSession.length > 0) return fromSession
  return process.cwd()
}

function hasWorkflowTool(ctx, exec) {
  const tools = typeof ctx.get === 'function' ? ctx.get('tools') : undefined
  if (tools === undefined || tools === null || typeof tools.get !== 'function') return false
  try {
    return tools.get('workflow', exec.agent) !== undefined
  } catch {
    return false
  }
}

function loadOrThrow(cwd, config, slug) {
  const resolved = resolveProject(cwd, config.projectDir, slug)
  if (resolved.paths === null) {
    return { error: '还没有小说项目。先调用 novel_studio(action=\'start\') 创建项目，或 action=\'template\' 查看模板。' }
  }
  const project = loadProject(resolved.paths)
  if (project === undefined) {
    return { error: '项目文件不存在或已损坏；可用 action=\'start\' 重新创建。' }
  }
  return { paths: resolved.paths, project }
}

/** Load an existing project or create one; never overwrite an existing project. */
function ensureProjectFromInput(cwd, config, args) {
  if (typeof args.slug === 'string' && args.slug.trim().length > 0) {
    const resolved = resolveProject(cwd, config.projectDir, args.slug.trim())
    if (resolved.paths !== null) {
      const existing = loadProject(resolved.paths)
      if (existing !== undefined) return { paths: resolved.paths, project: existing }
    }
  }
  const title = typeof args.title === 'string' && args.title.trim().length > 0
    ? args.title.trim()
    : null
  if (title !== null) {
    const candidate = projectPaths(cwd, config.projectDir, slugify(title))
    const existing = loadProject(candidate)
    if (existing !== undefined) return { paths: candidate, project: existing }
  }
  const titles = listProjects(cwd, config.projectDir)
  const finalTitle = title ?? `未命名小说-${titles.length + 1}`
  const paths = projectPaths(cwd, config.projectDir, slugify(finalTitle))
  const project = newProject({
    title: finalTitle,
    answers: {},
    chapterWords: clampChapterWords(args.chapterWords, 2500),
    rounds: clampRounds(args.rounds, config.defaultRounds),
    scanThreshold: config.scanThreshold,
  })
  ensureDirs(paths)
  writeTextAtomic(paths.template, `${renderTemplate({ full: true })}\n`)
  writeTextAtomic(paths.brief, `# ${finalTitle} · 设定卡\n\n（待填写）\n`)
  saveProject(paths, project)
  return { paths, project, created: true }
}

function describeProject(project, paths) {
  return {
    slug: project.slug,
    title: project.title,
    stage: project.stage,
    chapterWords: project.chapterWords,
    rounds: project.rounds,
    chapters: project.chapters.length,
    dir: paths.dir,
    next: nextStep(project),
  }
}

/** Merge project-level and runtime-level output preferences. */
function outputConfig(project) {
  const runtime = readRuntime().settings ?? {}
  const outputDir = (typeof project.outputDir === 'string' && project.outputDir.length > 0)
    ? project.outputDir
    : (typeof runtime.outputDir === 'string' ? runtime.outputDir : '')
  const outputMode = runtime.outputMode === 'chat' || runtime.outputMode === 'file'
    ? runtime.outputMode
    : (project.outputMode === 'chat' ? 'chat' : 'file')
  const autoPopup = typeof runtime.autoPopup === 'boolean'
    ? runtime.autoPopup
    : (typeof project.autoPopup === 'boolean' ? project.autoPopup : true)
  return { project: { ...project, outputDir }, outputMode, autoPopup }
}

/** Apply user-supplied output settings to a project record, validating the directory. */
function applyOutputSettings(project, args, cwd) {
  if (typeof args.outputDir === 'string') {
    const value = args.outputDir.trim()
    if (value.length === 0) {
      project.outputDir = ''
    } else {
      const base = path.resolve(cwd)
      const resolved = path.resolve(base, value)
      if (resolved !== base && !resolved.startsWith(base + path.sep)) {
        throw new Error('outputDir must stay inside the workspace')
      }
      project.outputDir = value
    }
  }
  if (args.outputMode === 'chat' || args.outputMode === 'file') project.outputMode = args.outputMode
  if (typeof args.autoPopup === 'boolean') project.autoPopup = args.autoPopup
  return project
}

function latestOutputFile(project, kind) {
  const outputs = Array.isArray(project.outputs) ? project.outputs : []
  for (let index = outputs.length - 1; index >= 0; index -= 1) {
    const item = outputs[index]
    if (item?.kind === kind && typeof item.absPath === 'string' && item.absPath.length > 0) return item.absPath
  }
  return ''
}

const RESUME_WINDOW_MS = 5 * 60 * 1000

/** Copy a completed output into versions/, keeping the last three per file. */function backupOutput(paths, resolved) {
  try {
    fs.mkdirSync(paths.versionsDir, { recursive: true })
    const base = path.basename(resolved)
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
    const target = path.join(paths.versionsDir, `${base}.${stamp}.txt`)
    fs.copyFileSync(resolved, target)
    const sameBase = fs.readdirSync(paths.versionsDir)
      .filter((name) => name.startsWith(`${base}.`))
      .sort()
    for (const name of sameBase.slice(0, Math.max(0, sameBase.length - 3))) {
      try { fs.unlinkSync(path.join(paths.versionsDir, name)) } catch { /* noop */ }
    }
    const all = fs.readdirSync(paths.versionsDir).sort()
    for (const name of all.slice(0, Math.max(0, all.length - 60))) {
      try { fs.unlinkSync(path.join(paths.versionsDir, name)) } catch { /* noop */ }
    }
    return target
  } catch (error) {
    console.warn(`[novel-studio] output backup failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/** Record where the work stopped, so a pause can be resumed later. */
function touchCheckpoint(project, { file = null, reviewed = false } = {}) {
  const now = Date.now()
  updateRuntime((state) => ({
    ...state,
    checkpoint: {
      at: now,
      projectSlug: project.slug,
      stage: project.stage,
      lastFile: file !== null ? file : (state.checkpoint?.lastFile ?? null),
      lastOutputAt: file !== null ? now : (state.checkpoint?.lastOutputAt ?? null),
      lastReviewAt: reviewed ? now : (state.checkpoint?.lastReviewAt ?? null),
      pendingResume: false,
    },
  }))
}

function twistWarning(project, kind) {
  const twist = Number.isFinite(project?.twist) ? project.twist : 30
  if (kind !== 'draft' || twist < 85) return { twist, warning: null }
  return {
    twist,
    warning: `⚠ 当前跳脱值 ${twist}/100 偏高：剧情可能偏离常规预期。请通读检查（右侧面板可打开全文），确认是否符合你的设想；你提出修改意见后我会进入审稿。`,
  }
}

function workflowScript() {
  return [
    '// 小说审稿 fan-out：把 novel_studio 返回的 data.reviewers 作为 args.reviewers 传入。',
    '// parallel() 会同时启动全部审稿子智能体并等待全部完成；不要改回逐个 await 的串行写法。',
    'const reviewers = Array.isArray(args?.reviewers) ? args.reviewers : [];',
    'if (reviewers.length === 0) return { error: "args.reviewers is required" };',
    'const results = await parallel(reviewers.map((reviewer) => async () => {',
    '  try {',
    '    const text = await agent(reviewer.prompt, { label: reviewer.name, phase: \'审稿\' });',
    '    return { id: reviewer.id, name: reviewer.name, text };',
    '  } catch (error) {',
    '    return { id: reviewer.id, name: reviewer.name, error: String(error) };',
    '  }',
    '}));',
    'return results;',
  ].join('\n')
}

export function createStudioTools({ ctx, config }) {
  const studio = {
    name: 'novel_studio',
    description: [
      '小说创作工作台（仅用于小说创作流程，不要用于其他写作任务）。',
      'action=start 创建项目；template 查看模板；brief 保存设定卡；outline/chapter_outline/draft 返回对应阶段的生成指令与落盘路径（正文由你按指令写入文件）；',
      'review_plan 返回本轮审稿角色与提示词（用 workflow 工具并行跑子智能体）；record 记录轮次；chart 提交故事图谱数据。',
      '只有用户明确同意启用小说工作台后才调用 start；status 可用于查看进度。',
    ].join(' '),
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: String(value?.message ?? '') }],
    },
    async execute(args, exec) {
      const cwd = await resolveCwd(ctx, exec)
      const action = args.action
      const runtime = readRuntime()
      if (runtime.workspace !== cwd) {
        updateRuntime((state) => ({ ...state, workspace: cwd }))
      }

      if (action === 'list') {
        const projects = listProjects(cwd, config.projectDir)
        return textResult(
          projects.length === 0
            ? '还没有小说项目。'
            : projects.map((item) => `- ${item.title}（${item.slug}，${item.stage}，${item.chapters} 章，更新 ${item.updatedAt}）`).join('\n'),
          { projects },
        )
      }

      if (action === 'status') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error, { exists: false })
        return textResult(formatStatus(loaded.project, { paths: loaded.paths }), describeProject(loaded.project, loaded.paths))
      }

      if (action === 'template') {
        const full = args.full === true
        return textResult(renderTemplate({ full }), { mode: full ? 'full' : 'compact' })
      }

      if (action === 'start') {
        const ensured = ensureProjectFromInput(cwd, config, args)
        ensured.project.twist = clampTwist(args.twist ?? ensured.project.twist, 30)
        if (typeof args.platform === 'string' && args.platform.trim().length > 0) {
          ensured.project.platform = args.platform.trim().slice(0, 40)
        }
        applyOutputSettings(ensured.project, args, cwd)
        saveProject(ensured.paths, ensured.project)
        const out = outputConfig(ensured.project)
        const card = renderChoiceCard({ chapterWords: ensured.project.chapterWords, rounds: ensured.project.rounds })
        return textResult(
          `${ensured.created ? '已创建' : '已载入'}项目《${ensured.project.title}》。\n项目目录：${ensured.paths.dir}\n生成文本将保存为 TXT：${out.project.outputDir || '（项目目录）'}\n跳脱值：${ensured.project.twist}/100（越高越反套路，离谱时会有保护提示）\n默认审稿角色：${describeRoles(selectRoles({ target: 'draft', roleSet: config.roleSet }))}（可在侧边栏勾选，或直接说"这轮用 X/Y"）\n\n${card}\n\n请把上面的模板精简版展示给用户，收集路线/维度/自由描述/自写大纲，然后调用 novel_studio(action='brief')。`,
          {
            ...describeProject(ensured.project, ensured.paths),
            outputMode: out.outputMode,
            autoPopup: out.autoPopup,
            outputDir: out.project.outputDir,
            twist: ensured.project.twist,
            defaultRoles: selectRoles({ target: 'draft', roleSet: config.roleSet }).map((role) => role.id),
          },
        )
      }

      if (action === 'brief') {
        const existing = loadOrThrow(cwd, config, args.slug)
        const ensured = existing.error
          ? ensureProjectFromInput(cwd, config, { ...args, title: typeof args.title === 'string' && args.title.trim().length > 0 ? args.title : '未命名小说' })
          : existing
        const { paths, project } = ensured
        const routes = applyRoutes(args.route)
        const supplied = args.answers !== null && typeof args.answers === 'object' && !Array.isArray(args.answers) ? args.answers : {}
        const answers = mergeAnswers(project.answers, routes.answers, supplied)
        if (typeof args.chapterWords === 'number') answers.chapterWords = clampChapterWords(args.chapterWords, project.chapterWords)
        if (typeof args.totalWords === 'number' && args.totalWords > 0) answers.totalWords = Math.round(args.totalWords)
        if (typeof args.totalChapters === 'number' && args.totalChapters > 0) answers.totalChapters = Math.round(args.totalChapters)
        const conflicts = detectConflicts(answers)
        project.answers = answers
        project.chapterWords = clampChapterWords(answers.chapterWords ?? args.chapterWords, project.chapterWords)
        project.totalWords = Number(answers.totalWords ?? 0)
        project.totalChapters = Number(answers.totalChapters ?? 0)
        project.rounds = clampRounds(args.rounds ?? project.rounds, config.defaultRounds)
        project.route = routes.applied.length > 0 ? routes.applied.join('、') : project.route
        project.platform = typeof args.platform === 'string' && args.platform.trim().length > 0
          ? args.platform.trim().slice(0, 40)
          : (typeof answers.platform === 'string' ? answers.platform : project.platform)
        project.twist = clampTwist(args.twist ?? answers.twist ?? project.twist, 30)
        project.stage = 'outline'
        applyOutputSettings(project, args, cwd)
        const sections = ['# 设定卡', '', formatAnswers(answers)]
        if (typeof args.freeform === 'string' && args.freeform.trim().length > 0) {
          sections.push('', '## 作者自由描述', '', args.freeform.trim())
        }
        let outlineText = typeof args.outlineText === 'string' ? args.outlineText.trim() : ''
        if (outlineText.length === 0 && typeof args.outlinePath === 'string' && args.outlinePath.length > 0) {
          const resolvedCwd = path.resolve(cwd)
          const candidate = path.resolve(resolvedCwd, args.outlinePath)
          if (!candidate.startsWith(resolvedCwd + path.sep)) throw new Error('outlinePath must stay inside the workspace')
          outlineText = readText(candidate, '').trim()
        }
        if (outlineText.length > 0) {
          writeTextAtomic(paths.outline, `${outlineText}\n`)
          project.stage = 'outline'
          sections.push('', '## 用户自带大纲', '', '已保存到 outline.md。')
        }
        if (conflicts.length > 0) sections.push('', '## 需要用户裁决的冲突', ...conflicts.map((item) => `- ${item}`))
        writeTextAtomic(paths.brief, `${sections.join('\n')}\n`)
        saveProject(paths, project)
        const out = outputConfig(project)
        const instruction = outlineInstructions(project, { file: resolveOutputFile(cwd, paths, out.project, 'outline'), outputMode: out.outputMode })
        const defaultRoles = selectRoles({ target: 'draft', roleSet: config.roleSet }).map((role) => role.name).join('、')
        return textResult(
          `设定卡已保存：${paths.brief}\n跳脱值：${project.twist}/100\n默认审稿角色：${defaultRoles}（可在侧边栏勾选或直接指定）\n${conflicts.length > 0 ? `\n注意这些冲突，需要用户确认：\n${conflicts.map((item) => `- ${item}`).join('\n')}\n` : ''}\n${instruction}`,
          { ...describeProject(project, paths), conflicts, outputMode: out.outputMode, outputDir: out.project.outputDir, twist: project.twist },
        )
      }

      if (action === 'outline') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const out = outputConfig(loaded.project)
        const file = resolveOutputFile(cwd, loaded.paths, out.project, 'outline')
        loaded.project.stage = 'outline'
        saveProject(loaded.paths, loaded.project)
        return textResult(outlineInstructions(loaded.project, { file, outputMode: out.outputMode, style: styleBlock(readStyleMemory()) }), {
          ...describeProject(loaded.project, loaded.paths),
          file,
          outputMode: out.outputMode,
          autoPopup: out.autoPopup,
        })
      }

      if (action === 'chapter_outline') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const start = Number.isInteger(args.from) && args.from > 0 ? args.from : loaded.project.chapters.length + 1
        const count = clampChapterCount(args.count, 3, config.maxChaptersPerOutline)
        const range = parseRange(start, count)
        const out = outputConfig(loaded.project)
        const file = resolveOutputFile(cwd, loaded.paths, out.project, 'chapter_outline', { from: range.from, count: range.count })
        const instruction = chapterOutlineInstructions(loaded.project, {
          from: range.from,
          count: range.count,
          file,
          outputMode: out.outputMode,
          style: styleBlock(readStyleMemory()),
        })
        loaded.project.stage = 'chapter_outline'
        for (let no = range.from; no <= range.to; no += 1) {
          upsertChapter(loaded.project, {
            no,
            outline: file,
            draft: null,
            status: 'outlined',
          })
        }
        saveProject(loaded.paths, loaded.project)
        return textResult(`${instruction}\n\n（本批共 ${range.count} 章，章纲 TXT：${file}）`, {
          ...describeProject(loaded.project, loaded.paths),
          from: range.from,
          to: range.to,
          count: range.count,
          file,
          outputMode: out.outputMode,
          autoPopup: out.autoPopup,
        })
      }

      if (action === 'draft') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const count = clampDraftCount(args.count, 1)
        const start = Number.isInteger(args.chapter) && args.chapter > 0 ? args.chapter : (loaded.project.chapters[0]?.no ?? 1)
        const words = clampChapterWords(args.chapterWords, loaded.project.chapterWords)
        const out = outputConfig(loaded.project)
        const files = []
        const blocks = []
        const style = styleBlock(readStyleMemory())
        for (let offset = 0; offset < count; offset += 1) {
          const no = start + offset
          const file = resolveOutputFile(cwd, loaded.paths, out.project, 'draft', { chapter: no, count: 1 })
          files.push(file)
          blocks.push(draftInstructions(loaded.project, { chapter: no, chapterWords: words, file, outputMode: out.outputMode, style }))
          upsertChapter(loaded.project, { no, outline: null, draft: file, status: 'drafted' })
        }
        loaded.project.chapterWords = words
        loaded.project.stage = 'draft'
        saveProject(loaded.paths, loaded.project)
        if (count > 1) blocks.unshift('批量写正文会稀释质量；建议逐章写、逐章审。')
        return textResult(blocks.join('\n\n---\n\n'), {
          ...describeProject(loaded.project, loaded.paths),
          files,
          chapterWords: words,
          outputMode: out.outputMode,
          autoPopup: out.autoPopup,
        })
      }

      if (action === 'review_plan') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const target = args.target ?? (loaded.project.stage === 'outline' ? 'outline' : loaded.project.stage === 'chapter_outline' ? 'chapter_outline' : 'draft')
        const rounds = clampRounds(args.rounds ?? loaded.project.rounds, config.defaultRounds)
        const round = clampRounds(args.round ?? (loaded.project.review?.lastRound ?? 0) + 1, 1)
        const literary = /纯文学|严肃文学/u.test(String(loaded.project.platform ?? ''))
        const roleSet = args.roleSet ?? config.roleSet
        const runtimeSettings = readRuntime().settings ?? {}
        const explicitRoles = Array.isArray(args.roles) && args.roles.length > 0
          ? args.roles
          : (Array.isArray(runtimeSettings.selectedRoles) && runtimeSettings.selectedRoles.length > 0
            ? runtimeSettings.selectedRoles
            : undefined)
        const roles = selectRoles({ target, roleSet, custom: explicitRoles, literary })
        const styleNote = styleBlock(readStyleMemory())
        let file = typeof args.file === 'string' && args.file.length > 0 ? args.file : ''
        if (file.length === 0) {
          const latest = latestOutputFile(loaded.project, target)
          if (latest.length > 0) {
            file = latest
          } else if (target === 'outline') {
            file = resolveOutputFile(cwd, loaded.paths, outputConfig(loaded.project).project, 'outline')
          } else if (target === 'chapter_outline') {
            const first = loaded.project.chapters[0]?.no ?? 1
            file = path.join(loaded.paths.chaptersDir, chapterOutlineFileName(first))
          } else {
            const no = loaded.project.chapters.find((item) => item.status === 'drafted')?.no ?? loaded.project.chapters[0]?.no ?? 1
            file = path.join(loaded.paths.chaptersDir, chapterFileName(no))
          }
        }
        const reviewers = roles.map((role) => ({
          id: role.id,
          name: role.name,
          prompt: [styleNote, rolePrompt(role, { target, file, content: '' })].filter((line) => line.length > 0).join('\n\n'),
        }))
        const merge = mergeInstructions({ target, roles, round, rounds })
        const plan = [
          `# 第 ${round}/${rounds} 轮审稿计划（${targetLabel(target)}）`,
          `审稿文件：${file}`,
          `角色（${roles.length} 个）：${describeRoles(roles)}`,
          '',
          '## 执行方式（推荐，必须并行）',
          '1. 用 workflow 工具并行启动这些子智能体（脚本里的 `parallel()` 会同时跑全部子智能体，并等待全部完成）：',
          '```js',
          workflowScript(),
          '```',
          '2. args 传本工具返回的 data.reviewers：`{ reviewers: [...] }`。',
          '3. 等待全部返回后，按下面的整合规则处理。',
          '4. 不要逐个调用 subagent 再等待——那会串行，慢好几倍。',
          '',
          '## 备选方式（仅在缺少 workflow 时）',
          hasWorkflowTool(ctx, exec)
            ? 'workflow 可用时优先用上面的脚本；逐个 subagent 只是降级方案。'
            : '当前会话没有 workflow 工具，只能逐个调用 subagent（会串行）。如果宿主支持同一步并发工具调用，可以一次发多个 subagent，但不要假设一定并行。',
          '',
          '## 并发与限流',
          'workflow 会同时发起全部审稿调用；若模型供应商有速率限制，失败会由重试策略处理。被限流时改用 roleSet=\'lean\' 或把角色分成两批跑。',
          '',
          '## 成本提示',
          `本轮 ${roles.length} 个子智能体；共 ${rounds} 轮。可用 roleSet='lean' 降本。`,
          explicitRoles === undefined
            ? '角色来自默认子集；可在侧边栏「小说创作」面板自由勾选要用的审稿角色。'
            : `角色来自${Array.isArray(args.roles) && args.roles.length > 0 ? '本次指定' : '侧边栏已选'}的 ${roles.length} 个。`,
          '',
          merge,
          '',
          '## 改写与复扫',
          reviseInstructions({ target, mustFix: [], suggestions: [] }),
        ].join('\n')
        return textResult(plan, {
          target,
          file,
          round,
          rounds,
          reviewers,
          workflowScript: workflowScript(),
          mergeRules: merge,
          roles: roles.map((role) => role.id),
        })
      }

      if (action === 'record') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const round = clampRounds(args.round ?? (loaded.project.review?.lastRound ?? 0) + 1, 1)
        const target = args.target ?? 'draft'
        recordReview(loaded.project, {
          round,
          target,
          accepted: args.accepted,
          findings: args.findings,
          scan: args.scan,
        })
        const file = path.join(loaded.paths.reviewsDir, `round-${round}-${target}.json`)
        writeJsonAtomic(file, {
          round,
          target,
          accepted: Array.isArray(args.accepted) ? args.accepted : [],
          findings: Number.isFinite(args.findings) ? args.findings : 0,
          scan: args.scan ?? null,
          at: new Date().toISOString(),
        })
        saveProject(loaded.paths, loaded.project)
        touchCheckpoint(loaded.project, { reviewed: true })
        return textResult(
          `已记录第 ${round} 轮审稿（${targetLabel(target)}）：${file}\n若用户仍不满意：可继续下一轮审稿，或调用 novel_studio(action='custom_review', issue='用户的具体意见') 生成专项审稿子智能体。`,
          { round, target, file },
        )
      }

      if (action === 'chart') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const payload = args.chart !== null && typeof args.chart === 'object' ? args.chart : {}
        const data = normalizeChartData(payload, { title: loaded.project.title })
        writeJsonAtomic(loaded.paths.charts, data)
        loaded.project.chartsVersion = Number(loaded.project.chartsVersion ?? 0) + 1
        saveProject(loaded.paths, loaded.project)
        return textResult(
          `故事图谱已更新（v${loaded.project.chartsVersion}）：${chartSummary(data)}\n在侧边栏打开「小说创作」→「查看故事图谱」即可查看。`,
          { version: loaded.project.chartsVersion, summary: data.summary, chapters: data.chapters.length, characters: data.characters.length },
        )
      }

      if (action === 'output_done') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        if (typeof args.file !== 'string' || args.file.trim().length === 0) {
          return textResult('output_done 需要 file 参数：模型写入的 TXT 路径。')
        }
        const resolved = path.resolve(cwd, args.file.trim())
        if (!isInsideWorkspace(cwd, resolved)) throw new Error('file must stay inside the workspace')
        const text = readText(resolved, '')
        if (text.trim().length === 0) {
          return textResult(`文件不存在或为空：${resolved}。请确认已先写入 TXT，再登记。`)
        }
        backupOutput(loaded.paths, resolved)
        const kind = args.kind === 'outline' || args.kind === 'chapter_outline' || args.kind === 'draft'
          ? args.kind
          : 'draft'
        const entry = {
          kind,
          path: path.relative(cwd, resolved),
          absPath: resolved,
          name: path.basename(resolved),
          chars: [...text].length,
          at: new Date().toISOString(),
        }
        loaded.project.outputs = [...(Array.isArray(loaded.project.outputs) ? loaded.project.outputs : []), entry].slice(-50)
        loaded.project.outputVersion = Number(loaded.project.outputVersion ?? 0) + 1
        const twist = twistWarning(loaded.project, kind)
        touchCheckpoint(loaded.project, { file: entry.absPath })
        saveProject(loaded.paths, loaded.project)
        const out = outputConfig(loaded.project)
        return textResult(
          [
            `已保存并登记：${entry.name}（${entry.chars} 字）。`,
            `路径：${resolved}`,
            out.autoPopup ? '界面会自动打开文本预览；用户可在面板关闭自动打开。' : '自动打开已关闭。',
            out.outputMode === 'chat' ? '本项目为「对话直出」：请在回复中完整贴出全文。' : '对话中给一句摘要即可。',
            twist.warning ?? '',
          ].filter((line) => line !== '').join('\n'),
          {
            output: entry,
            version: loaded.project.outputVersion,
            outputMode: out.outputMode,
            autoPopup: out.autoPopup,
            twist: twist.twist,
            twistWarning: twist.warning !== null,
          },
        )
      }

      if (action === 'learn_style') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        const hasExplicitOriginal = (typeof args.original === 'string' && args.original.trim().length > 0)
          || (typeof args.originalPath === 'string' && args.originalPath.trim().length > 0)
        if (loaded.error && !hasExplicitOriginal) return textResult(loaded.error)
        const project = loaded.error ? null : loaded.project
        const paths = loaded.error ? null : loaded.paths
        const revisedPath = typeof args.revisedPath === 'string' && args.revisedPath.trim().length > 0
          ? path.resolve(cwd, args.revisedPath.trim())
          : ''
        if (revisedPath.length > 0 && !isInsideWorkspace(cwd, revisedPath)) {
          throw new Error('revisedPath must stay inside the workspace')
        }
        const revisedText = typeof args.revised === 'string' && args.revised.trim().length > 0
          ? args.revised
          : (revisedPath.length > 0 ? readText(revisedPath, '') : '')
        if (revisedText.trim().length === 0) {
          return textResult('learn_style 需要 revised（改稿全文）或 revisedPath（工作区内的改稿文件）。')
        }
        let originalText = ''
        let originalFile = ''
        if (typeof args.original === 'string' && args.original.trim().length > 0) {
          originalText = args.original
        } else if (typeof args.originalPath === 'string' && args.originalPath.trim().length > 0) {
          originalFile = path.resolve(cwd, args.originalPath.trim())
          if (!isInsideWorkspace(cwd, originalFile)) throw new Error('originalPath must stay inside the workspace')
          originalText = readText(originalFile, '')
        } else if (paths !== null && project !== null) {
          const chapter = Number.isInteger(args.chapter) ? args.chapter : null
          const match = originalCandidates(paths, project, chapter)
            .find((item) => item.text.trim() !== revisedText.trim())
          if (match !== undefined) {
            originalText = match.text
            originalFile = match.file
          }
        }
        if (originalText.trim().length === 0) {
          return textResult('找不到原稿：请提供 original（原稿全文）或 originalPath（工作区内的原稿路径），或先对当前稿子调用 output_done 建立版本备份。')
        }
        let result
        try {
          result = learnFromRevision({
            original: originalText,
            revised: revisedText,
            meta: {
              projectSlug: project?.slug ?? '',
              chapter: Number.isInteger(args.chapter) ? args.chapter : null,
              label: typeof args.label === 'string' ? args.label : '',
              originalFile,
              revisedFile: revisedPath,
            },
          })
        } catch (error) {
          return textResult(error instanceof Error ? error.message : String(error))
        }
        if (result.duplicate) {
          return textResult('这篇改稿之前已经学习过，没有重复记录。', { duplicate: true })
        }
        if (result.unchanged) {
          return textResult('改稿与原稿完全相同，没有检测到修改。', { unchanged: true, stats: result.stats })
        }
        const stats = result.stats
        const lines = [
          `已比对：检测到 ${stats.changes} 处修改（增 ${stats.addedChars} 字 / 删 ${stats.removedChars} 字，改动比例 ${(stats.changeRatio * 100).toFixed(0)}%）。`,
          ...(result.truncated === true ? ['文本过长，比对时做了截断。'] : []),
          ...(stats.changeRatio > 0.7 ? ['注意：改动比例超过 70%，风格信号可能不够准确。'] : []),
          ...result.traits.map((trait) => `- ${trait.text}`),
          '',
          '已写入作者风格记忆；后续大纲/章纲/正文会自动参考。',
        ]
        return textResult(lines.join('\n'), {
          stats,
          traits: result.traits.map((trait) => trait.text),
          vocab: result.vocab,
          originalFile,
          revisedFile: revisedPath,
        })
      }

      if (action === 'style') {
        if (args.clear === true) {
          clearStyleMemory()
          return textResult('作者风格记忆已清空。', { cleared: true })
        }
        if (typeof args.enabled === 'boolean') {
          const memory = setStyleEnabled(args.enabled)
          return textResult(args.enabled ? '已启用作者风格记忆注入。' : '已关闭作者风格记忆注入（记忆保留）。', { enabled: memory.enabled })
        }
        const memory = readStyleMemory()
        const traits = memory.traits.slice(0, 15).map((trait) => `- ${trait.text}（命中 ${trait.hits ?? 1} 次）`)
        return textResult([
          `作者风格记忆：${memory.traits.length} 条偏好、${memory.samples.length} 个样本、${memory.vocab.length} 对用词替换（${memory.enabled ? '已启用' : '已关闭'}）。`,
          ...(traits.length > 0 ? ['', ...traits] : ['（还没有学习过改稿）']),
        ].join('\n'), { memory })
      }

      if (action === 'hooks') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const project = loaded.project
        const list = Array.isArray(project.hooks) ? project.hooks : []
        let added = 0
        for (const raw of Array.isArray(args.hooks) ? args.hooks : []) {
          if (raw === null || typeof raw !== 'object') continue
          const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, 500) : ''
          if (text.length === 0) continue
          const chapter = Number.isFinite(Number(raw.chapter)) ? Math.max(1, Math.trunc(Number(raw.chapter))) : 0
          const type = ['悬念', '伏笔', '反转', '谜题'].includes(raw.type) ? raw.type : '悬念'
          const title = typeof raw.title === 'string' && raw.title.trim().length > 0 ? raw.title.trim().slice(0, 80) : text.slice(0, 30)
          const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : `h${list.length + 1}`
          if (list.some((hook) => hook.id === id || (hook.chapter === chapter && hook.text === text))) continue
          const status = raw.status === 'resolved' ? 'resolved' : 'open'
          list.push({
            id, chapter, title, type, text, status,
            plantedAt: new Date().toISOString(),
            resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
          })
          added += 1
        }
        let resolvedCount = 0
        for (const rawId of Array.isArray(args.resolved) ? args.resolved : []) {
          const hook = list.find((item) => item.id === String(rawId))
          if (hook === undefined || hook.status === 'resolved') continue
          hook.status = 'resolved'
          hook.resolvedAt = new Date().toISOString()
          resolvedCount += 1
        }
        project.hooks = list.slice(-300)
        saveProject(loaded.paths, project)
        const open = project.hooks.filter((hook) => hook.status !== 'resolved').length
        return textResult(`钩子已记录：新增 ${added} 条、回收 ${resolvedCount} 条；当前未回收 ${open} 条（右侧面板可查看）。`, {
          added, resolved: resolvedCount, open, total: project.hooks.length, hooks: project.hooks,
        })
      }

      if (action === 'platform_scan') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const platform = typeof args.platform === 'string' && args.platform.trim().length > 0
          ? args.platform.trim().slice(0, 40)
          : (typeof loaded.project.platform === 'string' && loaded.project.platform.length > 0 ? loaded.project.platform : '')
        if (platform.length === 0) {
          return textResult('platform_scan 需要先确定平台：请用 ask_user_question 询问用户想在哪个平台发表（番茄 / 起点 / 晋江 / 知乎盐选 / 纯文学 / 暂不指定）。')
        }
        loaded.project.platform = platform
        saveProject(loaded.paths, loaded.project)
        const web = typeof ctx.get === 'function' ? ctx.get('web') : undefined
        const runtime = readRuntime()
        const cached = runtime.platformResearch
        let sources = []
        let digest = ''
        if (cached !== null
          && cached.platform === platform
          && Number.isFinite(cached.at)
          && Date.now() - cached.at < 10 * 60 * 1000) {
          sources = Array.isArray(cached.sources) ? cached.sources : []
          digest = typeof cached.digest === 'string' ? cached.digest : ''
        } else {
          const queries = [
            `${platform} 小说 热门题材 趋势`,
            `${platform} 小说 新书榜 题材 读者`,
            `${platform} 小说 潜力题材 细分赛道 网文`,
          ]
          if (web !== undefined && web !== null && typeof web.search === 'function') {
            for (const query of queries) {
              try {
                const result = await web.search({ query, maxResults: 5 })
                for (const source of Array.isArray(result.sources) ? result.sources : []) {
                  if (typeof source?.url !== 'string') continue
                  if (sources.some((item) => item.url === source.url)) continue
                  sources.push({ url: source.url, title: source.title ?? '', snippet: source.snippet ?? '' })
                }
                if (typeof result.content === 'string' && result.content.trim().length > 0) {
                  digest += `\n## 检索素材：${query}\n${result.content.trim().slice(0, 4000)}\n`
                }
              } catch (error) {
                digest += `\n（检索失败：${query}：${error instanceof Error ? error.message : String(error)}）\n`
              }
            }
          }
          updateRuntime((state) => ({ ...state, platformResearch: { platform, at: Date.now(), sources, digest } }))
        }
        const sourceBlock = sources.length > 0
          ? sources.map((source, index) => `${index + 1}. ${source.title || source.url}\n   ${source.url}\n   ${source.snippet}`).join('\n')
          : '（没有检索到可用来源；请不要编造数据，用类型逻辑推演并标注这是判断而非统计）'
        const subagentPrompt = [
          `你是一位「平台趋势分析师」，熟悉「${platform}」的读者结构与类型生态。`,
          '',
          '任务：基于下列检索素材，加上你自己的类型判断，给出该平台当前的热门方向与有潜力的方向。',
          '',
          '硬性要求：',
          '1. 区分「检索到的事实」与「你的判断」；事实标注来源，判断说明依据。',
          '2. 不要复述自媒体/公众号的套话，不要编造具体榜单数据；素材不足就直说。',
          '3. 忽略与网文无关的检索结果（比如把平台名当成农产品/股票关键词搜到的内容），不要把无关来源当依据。',
          '4. 输出三部分：① 当前热门方向（3–5 个，说明为什么热、适合什么人写）；② 有潜力但尚未拥挤的方向（3–5 个，说明机会与风险）；③ 给本项目的一句话定位建议（避开什么、抓住什么）。',
          '5. 最后给出 3 个可执行的选题/开篇建议，每个一行。',
          '',
          '检索素材：',
          sourceBlock,
          digest,
        ].join('\n')
        return textResult(
          [
            `平台已记录：${platform}。`,
            web !== undefined && web !== null
              ? `已检索 ${sources.length} 条来源。请先问用户是否调用「平台趋势分析师」子智能体做深度判断。`
              : '当前没有可用的联网搜索服务；请让用户决定是否调用「平台趋势分析师」子智能体（它可用 web 工具自行检索）。',
            '',
            subagentPrompt,
            '',
            '若用户同意：用 subagent 或 workflow 跑上面的子智能体，返回后把结论写入 brief（平台/方向/差异化）。',
            '若用户不调用：你根据素材与自己的类型判断直接给结论，并标注不确定性。',
          ].join('\n'),
          { platform, sources, subagentPrompt, askUser: '是否调用平台趋势分析师子智能体？' },
        )
      }

      if (action === 'custom_review') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const issue = typeof args.issue === 'string' ? args.issue.trim() : ''
        if (issue.length === 0) return textResult('custom_review 需要 issue 参数：请把用户具体不满意的地方写进来。')
        const target = args.target ?? 'draft'
        let file = typeof args.file === 'string' && args.file.length > 0 ? args.file : ''
        if (file.length === 0) {
          file = latestOutputFile(loaded.project, target)
          if (file.length === 0) file = resolveOutputFile(cwd, loaded.paths, outputConfig(loaded.project).project, target)
        }
        const prompt = [
          '你是一位「专项修改顾问」（custom reviewer）。',
          `用户对当前${targetLabel(target)}的具体意见：${issue}`,
          `待审文件：${file}。请先用 read 工具读取该文件。`,
          '',
          '审查要求：',
          '1. 只围绕用户提出的问题逐条定位，不要泛泛重写全文。',
          '2. 每条给出：位置（章/段/句）、问题、原因、最小改法。',
          '3. 如果用户的问题与文本实际不符，直接指出，不要迎合。',
          '4. 最后给出一个按优先级排序的最小改动清单。',
          '',
          '输出 JSON：{"issue":"...","findings":[{"location":"...","problem":"...","why":"...","fix":"..."}],"mustFix":["..."]}',
        ].join('\n')
        return textResult(
          [
            `已生成专项审稿提示词（针对用户意见：${issue}）。`,
            '效果上，独立子智能体比主智能体自审更客观，推荐用 subagent 跑一次；主模型也可按此清单直接改。',
            '执行方式：把下面内容作为子智能体任务；返回后由你整合并改写。',
            '',
            prompt,
          ].join('\n'),
          { issue, target, file, prompt, recommended: 'subagent' },
        )
      }

      if (action === 'resume') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const runtime = readRuntime()
        const checkpoint = runtime.checkpoint
        const withinWindow = checkpoint !== null && Number.isFinite(checkpoint.at)
          ? (Date.now() - checkpoint.at) <= RESUME_WINDOW_MS
          : false
        const last = Array.isArray(loaded.project.outputs) ? loaded.project.outputs[loaded.project.outputs.length - 1] : undefined
        const options = [
          { label: '放弃本次写作', description: '确认后删除本次项目文件' },
          { label: '补充信息', description: '先提供额外设定或线索' },
          { label: '继续生成', description: '恢复写作' },
          { label: '下次再来', description: '保存进度，下次说「继续」恢复' },
        ]
        if (withinWindow) {
          options.push({ label: '当前结果够用', description: '结束本次写作并保留现有内容（仅 5 分钟内可选）' })
        }
        return textResult(
          [
            `恢复检查点：项目《${loaded.project.title}》，阶段 ${loaded.project.stage}，最近文件：${last?.name ?? '无'}。`,
            withinWindow
              ? '距上次操作在 5 分钟内：五个选项都可用（放弃 / 补充信息 / 继续生成 / 当前结果够用 / 下次再来）。'
              : '距上次操作超过 5 分钟：只有「当前结果够用」不可用；其余四个选项（放弃 / 补充信息 / 继续生成 / 下次再来）始终可用。',
            '请用 ask_user_question 询问用户；选「下次再来」→ 调用 checkpoint 保存进度；选「补充信息」→ 等用户输入后再继续；选「放弃」→ 再确认一次后调用 discard。',
          ].join('\n'),
          {
            checkpoint,
            withinWindow,
            options,
            lastOutput: last ?? null,
            project: describeProject(loaded.project, loaded.paths),
          },
        )
      }

      if (action === 'checkpoint') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        const project = loaded.project
        const last = Array.isArray(project.outputs) ? project.outputs[project.outputs.length - 1] ?? null : null
        const summary = {
          projectSlug: project.slug,
          title: project.title,
          stage: project.stage,
          twist: project.twist,
          chapterWords: project.chapterWords,
          rounds: project.rounds,
          lastOutput: last,
          note: typeof args.note === 'string' ? args.note.slice(0, 500) : '',
          savedAt: new Date().toISOString(),
        }
        writeJsonAtomic(path.join(loaded.paths.dir, 'checkpoint.json'), summary)
        writeTextAtomic(path.join(loaded.paths.dir, 'checkpoint.md'), [
          '# 写作进度存档',
          '',
          `项目：${project.title}（${project.slug}）`,
          `阶段：${project.stage}`,
          `最近输出：${last?.name ?? '无'}${last ? `（${last.chars} 字）` : ''}`,
          `跳脱值：${project.twist}/100`,
          `保存时间：${summary.savedAt}`,
          summary.note ? `\n备注：${summary.note}` : '',
          '',
          '下次继续：对主模型说「继续写小说」或「继续上次进度」，插件会读取此存档。',
        ].join('\n'))
        updateRuntime((state) => ({
          ...state,
          checkpoint: {
            at: Date.now(),
            projectSlug: project.slug,
            stage: project.stage,
            lastFile: last?.absPath ?? state.checkpoint?.lastFile ?? null,
            lastOutputAt: last?.at ?? state.checkpoint?.lastOutputAt ?? null,
            lastReviewAt: state.checkpoint?.lastReviewAt ?? null,
            pendingResume: true,
          },
        }))
        return textResult(`进度已保存（checkpoint.md 与 checkpoint.json）。下次说「继续写小说」即可恢复。`, { checkpoint: summary })
      }

      if (action === 'discard') {
        const loaded = loadOrThrow(cwd, config, args.slug)
        if (loaded.error) return textResult(loaded.error)
        if (args.confirm !== true) {
          return textResult(`放弃会删除整个项目目录：${loaded.paths.dir}\n请让用户明确确认后，再调用一次并传 confirm=true。`, { requiresConfirm: true, dir: loaded.paths.dir })
        }
        const dir = loaded.paths.dir
        fs.rmSync(dir, { recursive: true, force: true })
        updateRuntime((state) => ({ ...state, checkpoint: null }))
        return textResult(`已删除本次写作产生的项目目录：${dir}`, { deleted: dir })
      }

      if (action === 'settings') {
        const current = readRuntime().settings
        const next = normalizePanelSettings(args.settings ?? {}, current)
        updateRuntime((state) => ({ ...state, settings: { ...state.settings, ...next } }))
        const latest = listProjects(cwd, config.projectDir)[0]
        if (latest !== undefined) {
          const paths = projectPaths(cwd, config.projectDir, latest.slug)
          const project = loadProject(paths)
          if (project !== undefined) {
            project.twist = next.twist
            if (typeof next.platform === 'string' && next.platform.length > 0) project.platform = next.platform
            saveProject(paths, project)
          }
        }
        return textResult(`设置已更新：审稿 ${next.rounds} 轮、每章 ${next.chapterWords} 字、AI 味阈值 ${next.scanThreshold}、跳脱值 ${next.twist}。`, { settings: next })
      }

      return textResult(`未知 action：${String(action)}`)
    },
  }

  const scan = {
    name: 'novel_scan',
    description: [
      '对小说文本做确定性 AI 味与可读性扫描（不调用模型）。',
      '读取工作区文件（file）或直接传入文本（text），返回套话命中、句长分布、对话占比、长句/晦涩指标、综合分与修改建议。',
      '每次改写后都应重新运行，并把结果传给 novel_studio(action=\'record\')。',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        file: { type: 'string', description: 'Workspace-relative or absolute path to scan.' },
        text: { type: 'string', description: 'Raw text to scan (takes priority over file).' },
        targetWords: { type: 'integer', description: 'Target word count, used for the length-delta check.' },
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: String(value?.message ?? '') }],
    },
    async execute(args, exec) {
      const cwd = await resolveCwd(ctx, exec)
      let text = typeof args.text === 'string' ? args.text : ''
      let file = ''
      if (text.trim().length === 0) {
        if (typeof args.file !== 'string' || args.file.trim().length === 0) {
          throw new Error('novel_scan needs either text or file')
        }
        const resolvedCwd = path.resolve(cwd)
        const resolved = path.resolve(resolvedCwd, args.file)
        if (!resolved.startsWith(resolvedCwd + path.sep)) throw new Error('file must stay inside the workspace')
        text = readText(resolved, '')
        file = resolved
        if (text.length === 0) throw new Error(`file is empty or unreadable: ${args.file}`)
      }
      const result = scanText(text, { targetWords: Number.isInteger(args.targetWords) ? args.targetWords : undefined })
      const banned = result.banned.slice(0, 10)
        .map((item) => `- ${item.phrase}（${item.level}，${item.count} 次，行 ${item.lines.join('/') || '—'}）`)
        .join('\n')
      const message = [
        `扫描结果：${summarizeScan(result)}`,
        file ? `文件：${file}` : '',
        '',
        '指标：',
        `- 句数 ${result.sentences}，平均句长 ${result.avgSentenceLength}，句长标准差 ${result.sentenceStdDev}`,
        `- 短句占比 ${Math.round(result.shortRatio * 100)}%，长句占比 ${Math.round(result.longRatio * 100)}%，对话占比 ${Math.round(result.dialogueRatio * 100)}%`,
        `- 成语密度 ${result.idiomDensity}/千字，比喻标记 ${result.metaphorDensity}/千字，指代 ${result.pronounDensity}/千字`,
        banned ? '\n套话命中：\n' + banned : '\n套话命中：无',
        result.repeatedOpenings.length > 0 ? `\n重复段落开头：${result.repeatedOpenings.join('、')}` : '',
        '',
        '建议：',
        ...result.suggestions.map((item) => `- ${item}`),
        result.mustRewrite.length > 0 ? `\n必须重写：\n${result.mustRewrite.map((item) => `- ${item}`).join('\n')}` : '',
      ].filter((line) => line !== '').join('\n')
      return textResult(message, { file, ...result })
    },
  }

  return { studio, scan }
}
