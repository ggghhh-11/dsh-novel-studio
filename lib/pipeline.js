/**
 * Pipeline state helpers: where the project is, what to do next, and how to
 * describe it. Pure functions plus file reads through store helpers.
 */

import fs from 'node:fs'
import path from 'node:path'
import { readText, projectPaths, listProjects } from './store.js'

export const STAGE_LABELS = {
  brief: '设定卡',
  outline: '大纲',
  chapter_outline: '章纲',
  draft: '正文',
  review: '审稿',
  done: '完成',
}

export function chapterFileName(no) {
  return `ch${String(no).padStart(3, '0')}.md`
}

export function chapterOutlineFileName(no) {
  return `ch${String(no).padStart(3, '0')}.outline.md`
}

/** A human-readable status block. */
export function formatStatus(project, { paths } = {}) {
  const chapters = Array.isArray(project.chapters) ? project.chapters : []
  const drafted = chapters.filter((item) => item.status === 'drafted' || item.status === 'reviewed').length
  const reviewed = chapters.filter((item) => item.status === 'reviewed').length
  const lines = [
    `《${project.title}》`,
    `阶段：${STAGE_LABELS[project.stage] ?? project.stage}`,
    `每章字数：${project.chapterWords}　审稿轮次：${project.rounds}　AI 味阈值：${project.scanThreshold}`,
    `章节：${chapters.length} 章章纲，${drafted} 章正文，${reviewed} 章完成审稿`,
  ]
  if (paths) lines.push(`项目目录：${paths.dir}`)
  if (chapters.some((item) => item.score !== undefined)) {
    const scored = chapters.filter((item) => Number.isFinite(item.score))
    if (scored.length > 0) {
      const average = Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
      lines.push(`最近正文平均 AI 味得分：${average}/100`)
    }
  }
  const next = nextStep(project)
  lines.push(`下一步：${next.hint}`)
  return lines.join('\n')
}

/** Decide the next action for a project. */
export function nextStep(project) {
  const stage = project?.stage ?? 'brief'
  const chapters = Array.isArray(project?.chapters) ? project.chapters : []
  if (stage === 'brief' || Object.keys(project?.answers ?? {}).length === 0) {
    return { stage: 'brief', action: 'brief', hint: '先完成设定卡：选路线/填维度/贴大纲，然后生成全书大纲。' }
  }
  if (stage === 'outline') {
    return { stage: 'outline', action: 'outline', hint: '生成全书大纲（novel_studio(action=\'outline\')），或直接开始批量章纲。' }
  }
  if (stage === 'chapter_outline') {
    return { stage: 'chapter_outline', action: 'chapter_outline', hint: '生成一批章纲（可一次 10 章），再进入正文。' }
  }
  if (stage === 'draft') {
    const pending = chapters.filter((item) => item.status !== 'drafted' && item.status !== 'reviewed')
    const next = pending.length > 0 ? pending[0].no : chapters.length + 1
    return { stage: 'draft', action: 'draft', hint: `写第 ${next} 章正文；写完先 novel_scan 再进入审稿。` }
  }
  if (stage === 'review') {
    return { stage: 'review', action: 'review_plan', hint: '按轮次跑审稿（review_plan → workflow → 整合 → 改写 → 复扫）。' }
  }
  return { stage: 'done', action: 'status', hint: '主线已完成；可继续下一章、修稿或规划续作。' }
}

/** Locate one project by slug, or the most recently updated one. */
export function resolveProject(cwd, projectDir, slug) {
  if (typeof slug === 'string' && slug.trim().length > 0) {
    const paths = projectPaths(cwd, projectDir, slug.trim())
    return { paths, exists: fs.existsSync(paths.project) }
  }
  const projects = listProjects(cwd, projectDir)
  if (projects.length === 0) return { paths: null, exists: false }
  const latest = projects[0]
  return { paths: projectPaths(cwd, projectDir, latest.slug), exists: true }
}

/** Read the current project's text context, capped for tool responses. */
export function readContext(paths, { maxChars = 12000 } = {}) {
  const outline = readText(paths?.outline ?? '', '')
  const brief = readText(paths?.brief ?? '', '')
  const chapterFiles = []
  try {
    for (const name of fs.readdirSync(paths.chaptersDir)) {
      if (!name.endsWith('.outline.md') && !name.endsWith('.md')) continue
      if (name.endsWith('.outline.md')) continue
      chapterFiles.push(name)
    }
  } catch {
    // no chapters yet
  }
  return {
    brief: brief.slice(0, maxChars),
    outline: outline.slice(0, maxChars),
    chapterCount: chapterFiles.length,
  }
}

/** Read one chapter's text, if present. */
export function readChapter(paths, no) {
  if (paths === null) return { outline: '', draft: '' }
  const dir = paths.chaptersDir
  return {
    outline: readText(path.join(dir, chapterOutlineFileName(no)), ''),
    draft: readText(path.join(dir, chapterFileName(no)), ''),
  }
}

/** Resolve the output file for a batch chapter outline. */
export function batchOutlineFile(from, count) {
  const to = from + count - 1
  const name = count === 1
    ? chapterOutlineFileName(from)
    : `ch${String(from).padStart(3, '0')}-${String(to).padStart(3, '0')}.outline.md`
  return name
}

/** Parse a chapter range like "1-10" or a single number. */
export function parseRange(from, count) {
  const start = Number.isInteger(from) && from > 0 ? from : 1
  const size = Number.isInteger(count) && count > 0 ? count : 3
  return { from: start, count: size, to: start + size - 1 }
}

/** Resolve the output directory for generated text files. */
export function resolveOutputDir(cwd, paths, project) {
  const base = path.resolve(cwd)
  const custom = typeof project?.outputDir === 'string' ? project.outputDir.trim() : ''
  if (custom.length === 0) return paths?.dir ?? base
  const resolved = path.resolve(base, custom)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('outputDir must stay inside the workspace')
  }
  return resolved
}

/** Readable TXT file name for one output kind. */
export function outputFileName(kind, { from = 1, count = 1, chapter = 1 } = {}) {
  if (kind === 'outline') return '大纲.txt'
  if (kind === 'chapter_outline') {
    if (count <= 1) return `第${String(from).padStart(3, '0')}章-章纲.txt`
    return `第${String(from).padStart(3, '0')}-${String(from + count - 1).padStart(3, '0')}章-章纲.txt`
  }
  if (count <= 1) return `第${String(chapter).padStart(3, '0')}章.txt`
  return `第${String(chapter).padStart(3, '0')}-${String(chapter + count - 1).padStart(3, '0')}章.txt`
}

export function ensureOutputDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Resolve one output file inside the workspace. */
export function resolveOutputFile(cwd, paths, project, kind, options = {}) {
  const dir = ensureOutputDir(resolveOutputDir(cwd, paths, project))
  return path.join(dir, outputFileName(kind, options))
}

/** Decide whether a generated file may be presented to the user. */
export function isInsideWorkspace(cwd, file) {
  const base = path.resolve(cwd)
  const resolved = path.resolve(file)
  return resolved === base || resolved.startsWith(base + path.sep)
}


export function recordReview(project, { round, target, accepted = [], findings = 0, scan = null }) {
  const history = Array.isArray(project.review?.history) ? project.review.history : []
  history.push({
    round,
    target,
    accepted: Array.isArray(accepted) ? accepted.slice(0, 50) : [],
    findings: Number.isFinite(findings) ? findings : 0,
    scan: scan === null || typeof scan !== 'object' ? null : {
      score: Number.isFinite(scan.score) ? scan.score : null,
      readability: Number.isFinite(scan.readability) ? scan.readability : null,
    },
    at: new Date().toISOString(),
  })
  project.review = { lastRound: Math.max(Number(project.review?.lastRound ?? 0), Number(round) || 0), history: history.slice(-40) }
  if (project.stage === 'review') project.stage = 'draft'
  return project
}
