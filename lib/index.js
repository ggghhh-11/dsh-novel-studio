/**
 * dsh-novel-studio host half.
 *
 * Responsibilities:
 * 1. Register the two tools that own the writing pipeline and scanning.
 * 2. Ask the user, at the first model step of a turn that clearly wants to
 *    write fiction, whether to enable the workbench.
 * 3. Serve the Client panel: state, charts, manual activation, panel settings.
 *
 * The plugin never generates prose itself; it supplies constraints, persists
 * project state, and measures output.
 */

import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { normalizeConfig } from './config.js'
import { detectCreationIntent, lastHumanText, answerMeansEnable } from './intent.js'
import {
  buildPlatformQuestions, buildPreferenceQuestions,
  parseIntakeAnswers, intakeAnswers, INTAKE_REVIEW_ALL,
} from './intake.js'
import { renderTemplate, formatAnswers } from './template.js'
import { createStudioTools } from './tools.js'
import { createRoutes, normalizePanelSettings } from './http.js'
import { chartSummary, normalizeChartData } from './charts.js'
import { deriveFromTexts, mergeChartData } from './chart-derive.js'
import { ROLES } from './roles.js'
import { learnFromRevision, readStyleMemory, setStyleEnabled, clearStyleMemory, originalCandidates } from './style.js'
import { isInsideWorkspace } from './pipeline.js'
import {
  listProjects, projectPaths, loadProject, readJson, readText, requestActivation, readRuntime,
  updateRuntime, writeJsonAtomic, writeTextAtomic, newProject, ensureDirs, slugify, saveProject,
} from './store.js'

export const name = 'dsh-novel-studio'
export const inject = ['tools']

const SOURCE_KIND = 'plugin:dsh-novel-studio'
const SESSIONS = new WeakMap()

function noticeMessage(text, summary) {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: {
      kind: SOURCE_KIND,
      form: 'notice',
      summary: summary ?? text.slice(0, 80),
    },
  }
}

function withNotice(decision, text) {
  if (decision === null || typeof decision !== 'object' || decision.kind !== 'enter') return decision
  return { ...decision, messages: [...(Array.isArray(decision.messages) ? decision.messages : []), noticeMessage(text)] }
}

function sessionState(agent) {
  let state = SESSIONS.get(agent)
  if (state === undefined) {
    state = { enabled: false, declined: false, askedTurn: -1, lastStage: null, projectSlug: null }
    SESSIONS.set(agent, state)
  }
  return state
}

async function defaultDirectory(ctx, projectDir = 'novel') {
  const runtime = readRuntime()
  const candidates = []
  const push = (dir) => {
    if (typeof dir === 'string' && dir.length > 0 && !candidates.includes(dir)) candidates.push(dir)
  }
  push(runtime.workspace)
  const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined
  if (agents !== undefined && agents !== null && typeof agents.list === 'function') {
    try {
      const roots = agents.list().filter((agent) => agent?.session?.header?.origin !== 'subagent')
      const directories = roots
        .map((agent) => agent?.session?.header?.cwd)
        .filter((cwd) => typeof cwd === 'string' && cwd.length > 0)
      if (directories.length > 0) push(directories[directories.length - 1])
    } catch {
      // fall through
    }
  }
  const wd = typeof ctx.get === 'function' ? ctx.get('workingDirectory') : undefined
  if (wd !== undefined && wd !== null) {
    if (typeof wd.defaultDirectory === 'string' && wd.defaultDirectory.length > 0) push(wd.defaultDirectory)
  }
  // The desktop app's stock workspace; keeps old novels visible after a
  // temporary session directory has overwritten the runtime pointer.
  push(path.join(os.homedir(), 'Documents', 'deepseek-harness', 'default-workspace'))
  push(process.cwd())
  // Prefer a workspace that already holds novel projects: a transient session
  // working directory (or a test run) must not make existing projects vanish.
  const withProjects = candidates.find((dir) => {
    try {
      return listProjects(dir, projectDir).length > 0
    } catch {
      return false
    }
  })
  return withProjects ?? candidates[0] ?? process.cwd()
}

async function sessionDirectory(ctx, agent, signal) {
  const wd = typeof ctx.get === 'function' ? ctx.get('workingDirectory') : undefined
  if (wd !== undefined && wd !== null && agent !== undefined && typeof wd.ensure === 'function') {
    try {
      return await wd.ensure(agent, signal)
    } catch {
      // fall through
    }
  }
  const cwd = agent?.session?.header?.cwd
  if (typeof cwd === 'string' && cwd.length > 0) return cwd
  return process.cwd()
}

function latestProjectInfo(cwd, config) {
  const projects = listProjects(cwd, config.projectDir)
  if (projects.length === 0) return null
  return projects[0]
}

function readLatestCharts(cwd, config, slug) {
  const info = slug ? { slug } : latestProjectInfo(cwd, config)
  if (info === null) return { data: null, slug: null }
  const paths = projectPaths(cwd, config.projectDir, info.slug)
  const project = loadProject(paths)
  if (project === undefined) return { data: null, slug: null }
  const raw = readJson(paths.charts, null)
  if (raw === null) {
    return {
      data: normalizeChartData({}, { title: project.title }),
      slug: project.slug,
      title: project.title,
    }
  }
  return { data: normalizeChartData(raw, { title: project.title }), slug: project.slug, title: project.title }
}

/** Chapter texts for chart fallback, newest output first. */
function readChapterTexts(project, paths) {
  const byNo = new Map()
  const outputs = Array.isArray(project?.outputs) ? project.outputs : []
  for (const entry of outputs) {
    if (entry?.kind !== 'draft' || typeof entry.absPath !== 'string') continue
    const name = typeof entry.name === 'string' ? entry.name : ''
    const match = /第(\d+)章\.txt$/u.exec(name)
    if (match === null) continue
    const no = Number.parseInt(match[1], 10)
    if (!Number.isFinite(no) || no <= 0 || byNo.has(no)) continue
    const text = readText(entry.absPath, '')
    if (text.trim().length > 0) byNo.set(no, { no, text })
  }
  if (byNo.size === 0 && paths !== null) {
    for (const dir of [paths.dir, paths.chaptersDir]) {
      if (!fs.existsSync(dir)) continue
      for (const name of fs.readdirSync(dir)) {
        const match = /^第(\d+)章\.txt$/u.exec(name)
        if (match === null) continue
        const no = Number.parseInt(match[1], 10)
        if (!Number.isFinite(no) || no <= 0 || byNo.has(no)) continue
        const text = readText(path.join(dir, name), '')
        if (text.trim().length > 0) byNo.set(no, { no, text })
      }
    }
  }
  return [...byNo.values()].sort((left, right) => left.no - right.no)
}

export function apply(ctx, rawConfig = {}) {
  const { config, warnings } = normalizeConfig(rawConfig)
  for (const warning of warnings) console.warn(`[novel-studio] ${warning}`)
  if (config.enabled === false) return

  const tools = createStudioTools({ ctx, config })
  ctx.effect(() => ctx.tools.register(tools.studio), 'dsh-novel-studio: novel_studio tool')
  ctx.effect(() => ctx.tools.register(tools.scan), 'dsh-novel-studio: novel_scan tool')

  const notify = (agent, text) => {
    try {
      if (typeof agent?.session?.append !== 'function') return false
      agent.session.append('user/message', noticeMessage(text), { surfaceOp: 'append' })
      return true
    } catch (error) {
      console.warn(`[novel-studio] append notice failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  const wake = (agent) => {
    try {
      if (typeof agent?.followup === 'function') agent.followup()
    } catch {
      // best effort
    }
  }

  const askService = () => (typeof ctx.get === 'function' ? ctx.get('userQuestions') : undefined)

  const enableNotice = (projectTitle) => [
    '【小说创作工作台已启用】用户已同意启用小说创作工作台。',
    projectTitle
      ? `已有项目《${projectTitle}》。请调用 novel_studio(action='status') 查看进度并继续。`
      : '请先问用户想在哪个平台发表（番茄 / 起点 / 晋江 / 知乎盐选 / 纯文学 / 暂不指定），再调用 novel_studio(action=\'start\', title=?, platform=?)；需要时用 novel_studio(action=\'platform_scan\', platform=?) 检索平台趋势。',
    '启动后先展示模板精简版，收集路线/维度/自由描述/自写大纲，再调用 novel_studio(action=\'brief\')。',
    '完整流程：brief →（先问用户要生成大纲/章纲/正文，不要直接开始）→ outline / chapter_outline / draft → review_plan（workflow 并行子智能体）→ 裁决改写 → novel_scan 复扫 → novel_studio(action=\'chart\') 更新图谱与钩子。',
    '审稿角色可在侧边栏「小说创作」面板自由勾选，或直接告诉模型「这轮用逻辑+合规+AI 味猎手」。',
    '不要跳过审稿与复扫；默认 2 轮，用户可改。',
  ].join('\n')

  const declineText = '用户选择暂不启用小说创作工作台。不要创建任何小说项目文件，按普通对话回应用户。'

  /** Search public sources for the chosen platform and cache the material. */
  const researchPlatform = async (platform) => {
    const web = typeof ctx.get === 'function' ? ctx.get('web') : undefined
    const queries = [
      `${platform} 小说 热门题材 趋势`,
      `${platform} 小说 新书榜 题材 读者`,
      `${platform} 小说 潜力题材 细分赛道 网文`,
    ]
    const sources = []
    let digest = ''
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
            digest += `\n## ${query}\n${result.content.trim().slice(0, 3000)}\n`
          }
        } catch {
          // one failed query must not abort the intake
        }
      }
    }
    const research = { platform, at: Date.now(), sources, digest }
    updateRuntime((state) => ({ ...state, platformResearch: research }))
    return research
  }

  /** Staged intake: platform first, then auto-search, then non-directional preferences. */
  const askIntake = async (agent, signal, { includeTitle = true } = {}) => {
    const service = askService()
    if (service === undefined || service === null || typeof service.ask !== 'function') return null
    const askOnce = async (questions, strict) => {
      try {
        const answer = await service.ask({ agent, signal, questions })
        return Array.isArray(answer?.answers) ? answer.answers : []
      } catch (error) {
        if (error?.code === 'ASK_ABORTED') {
          if (strict) throw error
          return []
        }
        console.warn(`[novel-studio] intake ask failed: ${error instanceof Error ? error.message : String(error)}`)
        return []
      }
    }
    let first
    try {
      first = await askOnce(buildPlatformQuestions({ includeTitle }), true)
    } catch {
      return null
    }
    const platform = parseIntakeAnswers({ answers: first }).platform
    const research = await researchPlatform(platform)
    const second = await askOnce(buildPreferenceQuestions(platform), false)
    return { intake: parseIntakeAnswers({ answers: [...first, ...second] }), research }
  }

  const createProjectFromIntake = (cwd, intake) => {
    const title = intake.title || '未命名小说'
    const paths = projectPaths(cwd, config.projectDir, slugify(title))
    const existing = loadProject(paths)
    if (existing !== undefined) return { paths, project: existing, created: false }
    const answers = intakeAnswers(intake)
    const project = newProject({
      title,
      answers,
      chapterWords: intake.chapterWords,
      rounds: config.defaultRounds,
      scanThreshold: config.scanThreshold,
    })
    project.platform = intake.platform
    project.twist = intake.twist
    project.stage = 'brief'
    ensureDirs(paths)
    writeTextAtomic(paths.template, `${renderTemplate({ full: true })}\n`)
    writeTextAtomic(paths.brief, `# 设定卡\n\n${formatAnswers(answers)}\n\n## 文风\n${intake.tone || '（未指定）'}\n`)
    saveProject(paths, project)
    return { paths, project, created: true }
  }

  const applyReviewerChoice = (choice) => {
    const selectedRoles = choice === INTAKE_REVIEW_ALL
      ? ROLES.map((role) => role.id)
      : []
    updateRuntime((state) => ({ ...state, settings: { ...state.settings, selectedRoles } }))
  }

  const applyIntake = (cwd, intake, research, existingProject) => {
    let result
    if (existingProject !== undefined && existingProject !== null) {
      const paths = projectPaths(cwd, config.projectDir, existingProject.slug)
      const project = loadProject(paths)
      if (project === undefined) return null
      project.platform = intake.platform
      project.chapterWords = intake.chapterWords
      project.twist = intake.twist
      project.answers = {
        ...(project.answers !== null && typeof project.answers === 'object' ? project.answers : {}),
        platform: intake.platform,
        length: intake.length,
        chapterWords: String(intake.chapterWords),
      }
      saveProject(paths, project)
      result = { paths, project, created: false }
    } else {
      result = createProjectFromIntake(cwd, intake)
    }
    applyReviewerChoice(intake.reviewerChoice)
    return { ...result, research }
  }

  const intakeNotice = (result, intake, research) => {
    const sourceLines = (research?.sources ?? []).slice(0, 6)
      .map((source, index) => `${index + 1}. ${source.title || source.url} — ${source.url}`)
    return [
      `【首次问卷完成，项目已${result.created ? '创建' : '更新'}】《${result.project.title}》`,
      `- 平台：${intake.platform}`,
      `- 篇幅：${intake.length || '未指定'}`,
      `- 每章字数：${intake.chapterWords}`,
      `- 审稿子智能体：${intake.reviewerChoice}`,
      `- 跳脱值：${intake.twist}`,
      `项目目录：${result.paths.dir}`,
      '',
      '已自动检索该平台的公开信息（不要使用预设的题材方向）：',
      ...(sourceLines.length > 0 ? sourceLines : ['（没有检索到来源；不要编造数据）']),
      research?.digest ? `\n素材摘要：\n${research.digest.slice(0, 1800)}` : '',
      '',
      '接下来必须完成：',
      '1. 先问用户是否调用「平台趋势分析师」子智能体；调用 novel_studio(action=\'platform_scan\', platform=...) 可拿到已缓存素材与提示词，用户同意就用 subagent 跑。',
      '2. 无论是否调用，都基于检索素材 + 你自己的判断，给出该平台当前的热门方向与有潜力方向（区分事实与判断，不要复述套话）。',
      '3. 再让用户确认题材 / 文风（先给判断再让用户选，不要直接给预设方向）。',
      '4. 调用 novel_studio(action=\'brief\') 保存设定卡；保存后先问用户要生成什么（全书大纲 / 章纲 / 正文），不要直接开始生成。',
    ].join('\n')
  }

  const ensureIntakeAndEnable = async (decision, agent, signal, cwd, existingProject) => {
    if (existingProject !== undefined && existingProject !== null
      && typeof existingProject.platform === 'string' && existingProject.platform.length > 0) {
      return withNotice(decision, enableNotice(existingProject.title))
    }
    const collected = await askIntake(agent, signal, { includeTitle: existingProject === undefined || existingProject === null })
    if (collected === null) {
      return withNotice(decision, [
        '用户同意启用，但跳过了平台问卷。',
        '请先询问：发表平台（确定后调用 platform_scan 检索并判断该平台当前热门/潜力方向，不要给预设方向）、题材、文风、篇幅、每章字数、审稿子智能体、跳脱值，再调用 novel_studio(action=\'start\')。',
      ].join('\n'))
    }
    const applied = applyIntake(cwd, collected.intake, collected.research, existingProject)
    if (applied === null) {
      return withNotice(decision, '问卷已完成，但项目文件不可用；请调用 novel_studio(action=\'start\') 重新创建。')
    }
    return withNotice(decision, intakeNotice(applied, collected.intake, collected.research))
  }

  const onPreStep = async (payload, next) => {
    const decision = await next()
    try {
      if (decision === null || typeof decision !== 'object' || decision.kind !== 'enter') return decision
      const { agent, step, turn, signal } = payload ?? {}
      if (agent === undefined || agent === null) return decision
      if (!Number.isInteger(step) || step !== 1) return decision
      if (signal?.aborted === true) return decision
      if (agent.session?.header?.origin === 'subagent') return decision

      const state = sessionState(agent)
      const runtime = readRuntime()
      const cwd = await sessionDirectory(ctx, agent, signal)
      const existing = latestProjectInfo(cwd, config)

      // Enabled once -> remember globally; an existing project also implies enabled.
      if (!state.enabled && (runtime.enabled === true || existing !== null)) state.enabled = true

      // A manual activation from the sidebar becomes visible at the next step (once).
      const pending = runtime.activationRequestedAt !== null
        && (runtime.activationConsumedAt === null || runtime.activationConsumedAt < runtime.activationRequestedAt)
      if (pending) {
        updateRuntime((current) => ({
          ...current,
          activationRequestedAt: null,
          activationConsumedAt: Date.now(),
          enabled: true,
        }))
        state.enabled = true
        state.declined = false
        const existingProject = existing === null
          ? undefined
          : loadProject(projectPaths(cwd, config.projectDir, existing.slug))
        return ensureIntakeAndEnable(decision, agent, signal, cwd, existingProject)
      }

      const humanText = lastHumanText(decision.messages)
      if (runtime.checkpoint !== null
        && runtime.checkpoint.pendingResume === true
        && /(继续|接着|恢复|上次|继续写|接着写|resume|continue)/iu.test(humanText)) {
        state.enabled = true
        state.declined = false
        updateRuntime((current) => ({
          ...current,
          checkpoint: current.checkpoint === null ? null : { ...current.checkpoint, pendingResume: false },
        }))
        return withNotice(decision, [
          '检测到用户想继续上次的小说写作，且存在进度存档。',
          '请调用 novel_studio(action=\'resume\')，按返回提示询问用户：放弃 / 补充信息 / 继续生成 / 当前结果够用 / 下次再来。',
        ].join('\n'))
      }

      if (state.enabled) return decision
      if (!config.autoAsk || state.declined) return decision

      const intent = detectCreationIntent(humanText)
      if (!intent.matched) return decision
      if (state.askedTurn === turn) return decision
      state.askedTurn = turn

      const service = askService()
      if (service === undefined || service === null || typeof service.ask !== 'function') {
        // No answerer available: let the model ask in normal conversation.
        return withNotice(decision, [
          '检测到用户想写小说。请先询问是否启用「小说创作工作台」（选项：启用 / 暂不启用）。',
          '用户同意后调用 novel_studio(action=\'start\')；不同意则按普通对话继续，不要创建文件。',
        ].join('\n'))
      }

      const question = existing
        ? {
            id: 'novel-studio-enable',
            header: '小说创作工作台',
            question: `检测到你想写小说。发现已有项目《${existing.title}》，是否继续这个项目？`,
            detail: '选「继续该项目」进入工作台；「新建项目」创建新的小说；「暂不启用」则按普通对话继续，不会创建任何文件。',
            options: [
              { label: '继续该项目', description: `从《${existing.title}》当前进度继续` },
              { label: '新建项目', description: '创建一个新的小说项目' },
              { label: '暂不启用', description: '不创建文件，按普通对话继续' },
            ],
          }
        : {
            id: 'novel-studio-enable',
            header: '小说创作工作台',
            question: '检测到你想写小说。是否启用「小说创作工作台」？',
            detail: '启用后提供创作模板、大纲/章纲/正文流水线、多子智能体审稿、AI 味扫描与故事图谱。选「暂不启用」不会创建任何文件。',
            options: [
              { label: '启用', description: '创建项目并展示创作模板' },
              { label: '暂不启用', description: '不创建文件，按普通对话继续' },
            ],
          }

      let answer
      try {
        answer = await service.ask({ agent, signal, questions: [question] })
      } catch (error) {
        if (error?.code === 'ASK_ABORTED') return decision
        console.warn(`[novel-studio] enable ask failed: ${error instanceof Error ? error.message : String(error)}`)
        return withNotice(decision, [
          '检测到用户想写小说。请先询问是否启用「小说创作工作台」（选项：启用 / 暂不启用）。',
          '用户同意后调用 novel_studio(action=\'start\')。',
        ].join('\n'))
      }

      if (!answerMeansEnable(answer)) {
        state.declined = true
        return withNotice(decision, declineText)
      }
      state.enabled = true
      state.declined = false
      updateRuntime((current) => ({ ...current, enabled: true }))
      const existingProject = existing === undefined || existing === null
        ? undefined
        : loadProject(projectPaths(cwd, config.projectDir, existing.slug))
      return ensureIntakeAndEnable(decision, agent, signal, cwd, existingProject)
    } catch (error) {
      console.warn(`[novel-studio] pre-step failed: ${error instanceof Error ? error.message : String(error)}`)
      return decision
    }
  }

  /** Save a resume checkpoint without waking the model. */
  const persistCheckpoint = (cwd, slug, note = '') => {
    const paths = projectPaths(cwd, config.projectDir, slug)
    const project = loadProject(paths)
    if (project === undefined) return null
    const last = Array.isArray(project.outputs) ? project.outputs[project.outputs.length - 1] ?? null : null
    const savedAt = new Date().toISOString()
    writeJsonAtomic(path.join(paths.dir, 'checkpoint.json'), {
      projectSlug: project.slug,
      title: project.title,
      stage: project.stage,
      twist: project.twist,
      chapterWords: project.chapterWords,
      rounds: project.rounds,
      lastOutput: last,
      note,
      savedAt,
    })
    writeTextAtomic(path.join(paths.dir, 'checkpoint.md'), [
      '# 写作进度存档',
      '',
      `项目：${project.title}（${project.slug}）`,
      `阶段：${project.stage}`,
      `最近输出：${last?.name ?? '无'}${last ? `（${last.chars} 字）` : ''}`,
      `跳脱值：${project.twist}/100`,
      `保存时间：${savedAt}`,
      note ? `\n备注：${note}` : '',
      '',
      '下次继续：对主模型说「继续写小说」或「继续上次进度」，插件会读取此存档。',
    ].join('\n'))
    return { paths, project, last, savedAt }
  }

  /** Ask what to do right after the user paused a writing turn. */
  const askPauseChoice = async (session) => {
    try {
      const service = typeof ctx.get === 'function' ? ctx.get('userQuestions') : undefined
      if (service === undefined || service === null || typeof service.ask !== 'function') return
      const checkpoint = readRuntime().checkpoint
      if (checkpoint === null || checkpoint.pauseAsked === true) return
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined
      const agent = agents !== undefined && agents !== null && typeof agents.get === 'function' ? agents.get(session.id) : undefined
      if (agent === undefined || agent === null) return
      const cwd = typeof session?.header?.cwd === 'string' && session.header.cwd.length > 0
        ? session.header.cwd
        : await defaultDirectory(ctx, config.projectDir)
      const withinWindow = Number.isFinite(checkpoint.at) ? (Date.now() - checkpoint.at) <= 5 * 60 * 1000 : false
      updateRuntime((state) => ({
        ...state,
        checkpoint: state.checkpoint === null ? null : { ...state.checkpoint, pauseAsked: true },
      }))
      const options = [
        { label: '继续生成', description: '恢复写作' },
        { label: '放弃本次写作', description: '确认后删除本次项目文件' },
        { label: '补充信息', description: '先补充设定或线索' },
        { label: '下次再来', description: '保存进度，下次说「继续」恢复' },
      ]
      if (withinWindow) options.push({ label: '当前结果够用', description: '结束本次写作并保留现有内容' })
      let answer
      try {
        answer = await service.ask({
          agent,
          questions: [{
            id: 'novel-studio-pause',
            header: '写作已暂停',
            question: '写作暂停了，接下来想怎么做？',
            detail: '「当前结果够用」只在距上次操作 5 分钟内出现；其余选项随时可用。',
            options,
          }],
        })
      } catch (error) {
        if (error?.code === 'ASK_ABORTED' || error?.code === 'ASK_CANCELLED') {
          updateRuntime((state) => ({
            ...state,
            checkpoint: state.checkpoint === null ? null : { ...state.checkpoint, pauseAsked: false },
          }))
          return
        }
        throw error
      }
      const item = Array.isArray(answer?.answers) ? answer.answers[0] : undefined
      const selected = Array.isArray(item?.selected) && item.selected.length > 0 ? String(item.selected[0]) : ''
      updateRuntime((state) => ({
        ...state,
        checkpoint: state.checkpoint === null
          ? null
          : { ...state.checkpoint, pauseAsked: false, choice: selected || null },
      }))
      if (selected.includes('下次再来')) {
        const saved = persistCheckpoint(cwd, checkpoint.projectSlug, '用户暂停后选择下次再来')
        updateRuntime((state) => ({
          ...state,
          checkpoint: state.checkpoint === null ? null : { ...state.checkpoint, pendingResume: true },
        }))
        notify(agent, saved === null
          ? '用户选择「下次再来」，但项目文件暂不可用；请提醒用户下次说「继续」恢复。'
          : `进度已保存到 ${saved.paths.dir}\\checkpoint.md。下次说「继续写小说」即可恢复。`)
        return
      }
      const notice = selected.includes('放弃')
        ? '用户暂停后选择「放弃本次写作」。请先复述将删除的项目目录并再次确认，确认后调用 novel_studio(action=\'discard\', confirm=true)。'
        : selected.includes('补充信息')
          ? '用户暂停后选择「补充信息」。请等待用户补充设定/线索，不要继续生成。'
          : selected.includes('继续生成')
            ? '用户暂停后选择「继续生成」。请从当前阶段继续写作。'
            : selected.includes('够用')
              ? '用户认为当前结果够用。请收尾并总结已完成内容，必要时调用 checkpoint 保存进度。'
              : '用户暂停后没有做出选择。请简短确认，等待用户下一步指示。'
      notify(agent, notice)
      if (!selected.includes('补充信息')) wake(agent)
    } catch (error) {
      updateRuntime((state) => ({
        ...state,
        checkpoint: state.checkpoint === null ? null : { ...state.checkpoint, pauseAsked: false },
      }))
      console.warn(`[novel-studio] pause ask failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  try {
    ctx.on('agent/pre-step', onPreStep)
  } catch (error) {
    console.warn(`[novel-studio] pre-step registration failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  // A user-paused turn keeps the last checkpoint so "继续" can resume it.
  try {
    ctx.on('session/event', (session, event) => {
      try {
        if (event?.type !== 'turn/end') return
        const sessionKind = session?.header?.origin
        if (sessionKind === 'subagent') return
        const reason = event.data?.reason
        const kind = reason?.kind
        if (kind !== 'aborted' && kind !== 'interrupted') return
        const runtime = readRuntime()
        if (runtime.checkpoint === null) return
        updateRuntime((state) => ({
          ...state,
          checkpoint: state.checkpoint === null
            ? null
            : { ...state.checkpoint, at: Date.now(), pausedAt: Date.now(), pendingResume: true },
        }))
        void askPauseChoice(session)
      } catch {
        // pause bookkeeping is advisory
      }
    })
  } catch (error) {
    console.warn(`[novel-studio] session/event registration failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  // --- Client-facing routes -------------------------------------------------
  const api = {
    async state() {
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const runtime = readRuntime()
      const projects = listProjects(cwd, config.projectDir)
      const latest = projects[0] ?? null
      let project = null
      let chartVersion = 0
      let lastOutput = null
      if (latest !== null) {
        const paths = projectPaths(cwd, config.projectDir, latest.slug)
        const loaded = loadProject(paths)
        if (loaded !== undefined) {
          chartVersion = Number(loaded.chartsVersion ?? 0)
          const outputs = Array.isArray(loaded.outputs) ? loaded.outputs : []
          const last = outputs[outputs.length - 1] ?? null
          if (last !== null) {
            lastOutput = {
              name: last.name,
              kind: last.kind,
              chars: last.chars,
              at: last.at,
              path: last.path,
            }
          }
          project = {
            slug: loaded.slug,
            title: loaded.title,
            stage: loaded.stage,
            chapters: Array.isArray(loaded.chapters) ? loaded.chapters.length : 0,
            chapterWords: loaded.chapterWords,
            rounds: loaded.rounds,
            updatedAt: loaded.updatedAt,
            outputVersion: Number(loaded.outputVersion ?? 0),
            outputMode: loaded.outputMode === 'chat' ? 'chat' : 'file',
            autoPopup: loaded.autoPopup !== false,
            outputDir: typeof loaded.outputDir === 'string' ? loaded.outputDir : '',
            platform: typeof loaded.platform === 'string' ? loaded.platform : '',
            platformGuidance: Array.isArray(loaded.platformGuidance) ? loaded.platformGuidance : [],
            twist: Number.isFinite(loaded.twist) ? loaded.twist : 30,
            hooksOpen: (Array.isArray(loaded.hooks) ? loaded.hooks : []).filter((hook) => hook.status !== 'resolved').length,
            hooksTotal: Array.isArray(loaded.hooks) ? loaded.hooks.length : 0,
          }
        }
      }
      return {
        enabled: true,
        workspace: cwd,
        project,
        projects: projects.slice(0, 20),
        chartVersion,
        lastOutput,
        pending: runtime.activationRequestedAt !== null
          && (runtime.activationConsumedAt === null || runtime.activationConsumedAt < runtime.activationRequestedAt),
        settings: normalizePanelSettings(runtime.settings, {
          rounds: config.defaultRounds,
          chapterWords: 2500,
          scanThreshold: config.scanThreshold,
          autoChart: config.autoChart,
          autoHelp: config.autoHelp,
          outputMode: 'file',
          autoPopup: true,
          outputDir: '',
          selectedRoles: [],
          panelTheme: 'auto',
          twist: 30,
          platform: '',
        }),
        config: { autoAsk: config.autoAsk, roleSet: config.roleSet, maxChaptersPerOutline: config.maxChaptersPerOutline },
      }
    },
    async charts(slug) {
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const found = readLatestCharts(cwd, config, typeof slug === 'string' && slug.length > 0 ? slug : undefined)
      if (found.data === null || found.slug === null) {
        return { data: found.data, slug: found.slug, title: found.title ?? null, summary: '' }
      }
      const paths = projectPaths(cwd, config.projectDir, found.slug)
      const project = loadProject(paths)
      const texts = project === undefined ? [] : readChapterTexts(project, paths)
      const derived = deriveFromTexts(texts, project?.review?.history ?? [])
      const data = mergeChartData(found.data, derived)
      return { data, slug: found.slug, title: found.title ?? null, summary: chartSummary(data) }
    },
    async output() {
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const latest = latestProjectInfo(cwd, config)
      if (latest === null) return { empty: true, message: '还没有输出文件' }
      const paths = projectPaths(cwd, config.projectDir, latest.slug)
      const project = loadProject(paths)
      if (project === undefined) return { empty: true, message: '项目不存在' }
      const outputs = Array.isArray(project.outputs) ? project.outputs : []
      const last = outputs[outputs.length - 1]
      if (last === undefined || typeof last.absPath !== 'string') return { empty: true, message: '还没有生成文本' }
      const text = readText(last.absPath, '')
      const MAX = 200_000
      return {
        empty: false,
        name: last.name,
        kind: last.kind,
        path: last.absPath,
        chars: last.chars,
        at: last.at,
        version: Number(project.outputVersion ?? 0),
        text: text.length > MAX ? text.slice(0, MAX) : text,
        truncated: text.length > MAX,
      }
    },
    roles() {
      return ROLES.map((role) => ({ id: role.id, name: role.name, group: role.group, duty: role.duty }))
    },
    async hooks() {
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const latest = latestProjectInfo(cwd, config)
      if (latest === null) return { hooks: [], project: null, open: 0 }
      const paths = projectPaths(cwd, config.projectDir, latest.slug)
      const project = loadProject(paths)
      if (project === undefined) return { hooks: [], project: null, open: 0 }
      const hooks = Array.isArray(project.hooks) ? project.hooks : []
      return {
        hooks,
        project: { slug: project.slug, title: project.title },
        open: hooks.filter((hook) => hook.status !== 'resolved').length,
        twist: Number.isFinite(project.twist) ? project.twist : 30,
      }
    },
    async discard(body) {
      if (body?.confirm !== true) throw new Error('confirm=true is required to delete a project')
      const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
      if (slug.length === 0) throw new Error('slug is required')
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const paths = projectPaths(cwd, config.projectDir, slug)
      const project = loadProject(paths)
      if (project === undefined) return { deleted: false, message: '项目不存在' }
      fs.rmSync(paths.dir, { recursive: true, force: true })
      const runtime = readRuntime()
      if (runtime.checkpoint !== null && runtime.checkpoint.projectSlug === slug) {
        updateRuntime((state) => ({ ...state, checkpoint: null }))
      }
      return { deleted: true, slug, title: project.title }
    },
    async create(body) {
      const title = typeof body?.title === 'string' && body.title.trim().length > 0
        ? body.title.trim().slice(0, 60)
        : '未命名小说'
      const platform = typeof body?.platform === 'string' && body.platform.trim().length > 0
        ? body.platform.trim().slice(0, 40)
        : '暂不指定'
      const genre = typeof body?.genre === 'string' ? body.genre.trim().slice(0, 120) : ''
      const tone = typeof body?.tone === 'string' ? body.tone.trim().slice(0, 120) : ''
      const length = typeof body?.length === 'string' ? body.length.trim().slice(0, 20) : ''
      const chapterWords = Math.min(8000, Math.max(800,
        Number.isFinite(Number(body?.chapterWords)) ? Math.round(Number(body.chapterWords)) : 2500))
      const twist = Math.min(100, Math.max(0,
        Number.isFinite(Number(body?.twist)) ? Math.round(Number(body.twist)) : 30))
      const cwd = await defaultDirectory(ctx, config.projectDir)
      const paths = projectPaths(cwd, config.projectDir, slugify(title))
      if (loadProject(paths) !== undefined) {
        const error = new Error('同名项目已存在，请换一个书名')
        error.statusCode = 409
        throw error
      }
      const created = createProjectFromIntake(cwd, { title, platform, genre, tone, length, chapterWords, twist })
      return {
        project: {
          slug: created.project.slug,
          title: created.project.title,
          platform: created.project.platform,
          stage: created.project.stage,
        },
      }
    },
    async learn(body) {
      const cwd = await defaultDirectory(ctx, config.projectDir)
      let revised = typeof body?.revised === 'string' ? body.revised : ''
      let revisedFile = ''
      if (revised.trim().length === 0 && typeof body?.revisedPath === 'string' && body.revisedPath.trim().length > 0) {
        revisedFile = path.resolve(cwd, body.revisedPath.trim())
        if (!isInsideWorkspace(cwd, revisedFile)) throw new Error('revisedPath must stay inside the workspace')
        revised = readText(revisedFile, '')
      }
      if (revised.trim().length === 0) throw new Error('revised 或 revisedPath 不能为空')
      let original = typeof body?.original === 'string' ? body.original : ''
      let originalFile = ''
      if (original.trim().length === 0 && typeof body?.originalPath === 'string' && body.originalPath.trim().length > 0) {
        originalFile = path.resolve(cwd, body.originalPath.trim())
        if (!isInsideWorkspace(cwd, originalFile)) throw new Error('originalPath must stay inside the workspace')
        original = readText(originalFile, '')
      }
      let projectSlug = ''
      const chapter = Number.isInteger(body?.chapter) ? body.chapter : null
      if (original.trim().length === 0) {
        const info = latestProjectInfo(cwd, config)
        if (info !== null) {
          const paths = projectPaths(cwd, config.projectDir, info.slug)
          const project = loadProject(paths)
          if (project !== undefined) {
            projectSlug = project.slug
            const match = originalCandidates(paths, project, chapter)
              .find((item) => item.text.trim() !== revised.trim())
            if (match !== undefined) {
              original = match.text
              originalFile = match.file
            }
          }
        }
      }
      if (original.trim().length === 0) {
        throw new Error('找不到原稿：请提供 original/originalPath，或先 output_done 建立版本备份')
      }
      const result = learnFromRevision({
        original,
        revised,
        meta: {
          projectSlug,
          chapter,
          label: typeof body?.label === 'string' ? body.label : '',
          originalFile,
          revisedFile,
        },
      })
      if (result.duplicate) return { duplicate: true, message: '这篇改稿之前已经学习过' }
      if (result.unchanged) return { unchanged: true, message: '没有检测到修改', stats: result.stats }
      return {
        duplicate: false,
        unchanged: false,
        stats: result.stats,
        traits: result.traits.map((trait) => trait.text),
        vocab: result.vocab,
        truncated: result.truncated === true,
        projectSlug,
      }
    },
    async style() {
      return { memory: readStyleMemory() }
    },
    async styleSettings(body) {
      if (body?.clear === true) return { cleared: true, memory: clearStyleMemory() }
      if (typeof body?.enabled === 'boolean') return { enabled: setStyleEnabled(body.enabled).enabled }
      return { memory: readStyleMemory() }
    },
    async activate() {
      requestActivation()
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined
      let delivered = false
      if (agents !== undefined && agents !== null && typeof agents.list === 'function') {
        let roots = []
        try {
          roots = agents.list().filter((agent) => agent?.session?.header?.origin !== 'subagent')
        } catch {
          roots = []
        }
        if (roots.length === 1) {
          const agent = roots[0]
          delivered = notify(agent, enableNotice(null))
          if (delivered) {
            updateRuntime((state) => ({ ...state, activationConsumedAt: Date.now() }))
            wake(agent)
          }
        }
      }
      return { delivered, message: delivered ? '已启用，回到对话即可开始。' : '已登记启用；回到对话发送任意消息即可开始。' }
    },
    settings(patch) {
      const current = readRuntime().settings
      const next = normalizePanelSettings(patch, current)
      updateRuntime((state) => ({ ...state, settings: { ...state.settings, ...next } }))
      return next
    },
  }

  let routeDisposers = []
  try {
    ctx.inject(['webServer'], (scoped) => {
      for (const route of createRoutes(api)) {
        try {
          routeDisposers.push(scoped.webServer.register(route))
        } catch (error) {
          console.warn(`[novel-studio] route ${route.path} not mounted: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      scoped.effect(() => () => {
        const disposers = routeDisposers
        routeDisposers = []
        for (const dispose of disposers) {
          try { dispose() } catch { /* best effort */ }
        }
      }, 'dsh-novel-studio: routes')
    })
  } catch (error) {
    console.warn(`[novel-studio] webServer unavailable: ${error instanceof Error ? error.message : String(error)}`)
  }
}
