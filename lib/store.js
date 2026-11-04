/**
 * Project persistence for the novel workbench.
 *
 * All user content lives under `<cwd>/<projectDir>/<slug>/`; every path is
 * resolved and checked against that base before any write. Reads tolerate
 * missing or corrupt JSON and fall back to a fresh state instead of throwing.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

export const SCHEMA_VERSION = 1
export const STAGES = ['brief', 'outline', 'chapter_outline', 'draft', 'review', 'done']

function nowIso() {
  return new Date().toISOString()
}

/** Sanitize a title into a stable, filesystem-safe slug. */
export function slugify(title) {
  const source = String(title ?? '').trim()
  const asciiSafe = source
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, '')
    .replace(/\s+/gu, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, 32)
  const base = asciiSafe.length > 0 ? asciiSafe : 'novel'
  const hash = createHash('sha1').update(source || 'novel').digest('hex').slice(0, 6)
  return `${base}-${hash}`
}

/** Root of all novel projects for one working directory. */
export function novelsRoot(cwd, projectDir = 'novel') {
  return path.resolve(cwd, projectDir)
}

/**
 * Resolve a path inside the novels root, refusing traversal.
 * @throws when the resolved path escapes the root
 */
export function safeJoin(root, ...parts) {
  const base = path.resolve(root)
  const target = path.resolve(base, ...parts)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error(`refusing to touch a path outside the novels root: ${target}`)
  }
  return target
}

export function projectPaths(cwd, projectDir, slug) {
  const root = novelsRoot(cwd, projectDir)
  const dir = safeJoin(root, slug)
  return {
    root,
    dir,
    project: path.join(dir, 'project.json'),
    template: path.join(dir, 'template.md'),
    brief: path.join(dir, 'brief.md'),
    outline: path.join(dir, 'outline.md'),
    charts: path.join(dir, 'charts.json'),
    chaptersDir: path.join(dir, 'chapters'),
    reviewsDir: path.join(dir, 'reviews'),
    historyDir: path.join(dir, 'history'),
  }
}

export function ensureDirs(paths) {
  for (const dir of [paths.dir, paths.chaptersDir, paths.reviewsDir, paths.historyDir]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function readText(file, fallback = '') {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return fallback
  }
}

export function readJson(file, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback
    return parsed
  } catch {
    return fallback
  }
}

export function writeTextAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(temp, text, 'utf8')
  try {
    fs.renameSync(temp, file)
  } catch {
    try {
      fs.writeFileSync(file, text, 'utf8')
    } finally {
      try { fs.unlinkSync(temp) } catch { /* best effort */ }
    }
  }
}

export function writeJsonAtomic(file, value) {
  writeTextAtomic(file, `${JSON.stringify(value, null, 2)}\n`)
}

/** A fresh project record. */
export function newProject({ title, answers = {}, chapterWords = 2500, rounds = 2, route = null, platform = null, scanThreshold = 70 } = {}) {
  const now = nowIso()
  return {
    schemaVersion: SCHEMA_VERSION,
    slug: slugify(title),
    title: String(title ?? '未命名小说').trim() || '未命名小说',
    createdAt: now,
    updatedAt: now,
    stage: 'brief',
    route,
    platform,
    answers: answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {},
    chapterWords,
    totalWords: 0,
    totalChapters: 0,
    rounds,
    scanThreshold,
    chapters: [],
    review: { lastRound: 0, history: [] },
    chartsVersion: 0,
    outputs: [],
    outputVersion: 0,
    outputDir: '',
    outputMode: 'file',
    autoPopup: true,
    hooks: [],
    twist: 30,
  }
}

/** Load a project record or undefined. */
export function loadProject(paths) {
  const value = readJson(paths.project, undefined)
  if (value === undefined) return undefined
  if (value.schemaVersion !== SCHEMA_VERSION) return undefined
  if (typeof value.slug !== 'string' || typeof value.title !== 'string') return undefined
  if (!Array.isArray(value.chapters)) value.chapters = []
  if (value.review === null || typeof value.review !== 'object') value.review = { lastRound: 0, history: [] }
  if (!Array.isArray(value.outputs)) value.outputs = []
  if (!Number.isFinite(value.outputVersion)) value.outputVersion = 0
  if (typeof value.outputDir !== 'string') value.outputDir = ''
  if (value.outputMode !== 'chat' && value.outputMode !== 'file') value.outputMode = 'file'
  if (typeof value.autoPopup !== 'boolean') value.autoPopup = true
  if (!Array.isArray(value.hooks)) value.hooks = []
  if (!Number.isFinite(value.twist)) value.twist = 30
  value.twist = Math.min(100, Math.max(0, Math.trunc(value.twist)))
  return value
}

export function saveProject(paths, project) {
  const next = { ...project, updatedAt: nowIso() }
  writeJsonAtomic(paths.project, next)
  return next
}

/** List projects under the novels root, newest first. */
export function listProjects(cwd, projectDir) {
  const root = novelsRoot(cwd, projectDir)
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const projects = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const paths = projectPaths(cwd, projectDir, entry.name)
    const project = loadProject(paths)
    if (project === undefined) continue
    projects.push({
      slug: project.slug,
      title: project.title,
      stage: project.stage,
      updatedAt: project.updatedAt,
      chapters: Array.isArray(project.chapters) ? project.chapters.length : 0,
      chartVersion: Number(project.chartsVersion ?? 0),
    })
  }
  projects.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
  return projects
}

/** Archive the current draft file before a rewrite. */
export function archiveFile(paths, file, label) {
  if (!fs.existsSync(file)) return undefined
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-')
  const target = path.join(paths.historyDir, `${label}-${stamp}.md`)
  try {
    fs.mkdirSync(paths.historyDir, { recursive: true })
    fs.copyFileSync(file, target)
    return target
  } catch {
    return undefined
  }
}

/** Mark a chapter's state inside the project record. */
export function upsertChapter(project, chapter) {
  const list = Array.isArray(project.chapters) ? project.chapters : []
  const index = list.findIndex((item) => Number(item.no) === Number(chapter.no))
  if (index === -1) list.push({ ...chapter })
  else list[index] = { ...list[index], ...chapter }
  list.sort((left, right) => Number(left.no) - Number(right.no))
  project.chapters = list
  return project
}

// ---------------------------------------------------------------------------
// User-level runtime state (activation requests and panel settings)
// ---------------------------------------------------------------------------

function runtimeRoot() {
  const profileDir = process.env.DSH_PROFILE_DIR
  if (typeof profileDir === 'string' && profileDir.length > 0) {
    return path.join(profileDir, '.novel-studio')
  }
  return path.join(os.homedir(), '.dsh', 'novel-studio')
}

export function runtimePaths() {
  const dir = runtimeRoot()
  return { dir, file: path.join(dir, 'runtime.json') }
}

export function readRuntime() {
  const paths = runtimePaths()
  const value = readJson(paths.file, {})
  return {
    activationRequestedAt: Number.isFinite(value.activationRequestedAt) ? value.activationRequestedAt : null,
    activationConsumedAt: Number.isFinite(value.activationConsumedAt) ? value.activationConsumedAt : null,
    workspace: typeof value.workspace === 'string' && value.workspace.length > 0 ? value.workspace : null,
    settings: value.settings !== null && typeof value.settings === 'object' && !Array.isArray(value.settings) ? value.settings : {},
    checkpoint: value.checkpoint !== null && typeof value.checkpoint === 'object' && !Array.isArray(value.checkpoint)
      ? value.checkpoint
      : null,
  }
}

export function updateRuntime(mutate) {
  const paths = runtimePaths()
  const current = readRuntime()
  const next = mutate({ ...current, settings: { ...current.settings } }) ?? current
  try {
    fs.mkdirSync(paths.dir, { recursive: true })
    writeJsonAtomic(paths.file, next)
  } catch {
    // Runtime state is advisory; a failure must not break a tool call.
  }
  return next
}

export function requestActivation() {
  return updateRuntime((state) => ({ ...state, activationRequestedAt: Date.now() }))
}

export function consumeActivation() {
  const state = readRuntime()
  if (state.activationRequestedAt === null) return null
  if (state.activationConsumedAt !== null && state.activationConsumedAt >= state.activationRequestedAt) return null
  updateRuntime((current) => ({ ...current, activationConsumedAt: Date.now() }))
  return state.activationRequestedAt
}
