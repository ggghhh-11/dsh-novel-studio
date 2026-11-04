/**
 * Chart payload validation and deterministic natural-language summaries.
 *
 * The model submits a compact story map; this module clamps every number,
 * drops dangling relations, and derives a one-line summary so the panel always
 * has something sensible to show even when the model omitted it.
 */

const MAX_CHAPTERS = 2000
const MAX_CHARACTERS = 200
const MAX_RELATIONS = 600
const MAX_METRICS = 40

function clampNumber(value, min, max, fallback = 0) {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function cleanString(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

/** Normalize a chart payload submitted by the model. */
export function normalizeChartData(raw, { title = '未命名项目' } = {}) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const chapters = []
  const seenChapters = new Set()
  for (const item of Array.isArray(source.chapters) ? source.chapters.slice(0, MAX_CHAPTERS) : []) {
    if (item === null || typeof item !== 'object') continue
    const rawNo = Number.parseInt(String(item.no ?? ''), 10)
    if (!Number.isFinite(rawNo) || rawNo <= 0) continue
    const no = Math.min(9999, rawNo)
    if (seenChapters.has(no)) continue
    seenChapters.add(no)
    chapters.push({
      no,
      title: cleanString(item.title, 60),
      tension: Math.round(clampNumber(item.tension, 0, 100, 50)),
      hook: Math.round(clampNumber(item.hook, 0, 100, 50)),
      emotion: cleanString(item.emotion, 24),
      words: Math.round(clampNumber(item.words, 0, 200000, 0)),
    })
  }
  chapters.sort((left, right) => left.no - right.no)

  const characters = []
  const characterIds = new Set()
  for (const item of Array.isArray(source.characters) ? source.characters.slice(0, MAX_CHARACTERS) : []) {
    if (item === null || typeof item !== 'object') continue
    const name = cleanString(item.name, 40)
    if (name.length === 0) continue
    let id = cleanString(item.id, 40) || name
    if (characterIds.has(id)) id = `${id}-${characters.length + 1}`
    characterIds.add(id)
    characters.push({
      id,
      name,
      role: cleanString(item.role, 24) || '配角',
      group: cleanString(item.group, 24),
    })
  }

  const relations = []
  const relationKeys = new Set()
  for (const item of Array.isArray(source.relations) ? source.relations.slice(0, MAX_RELATIONS) : []) {
    if (item === null || typeof item !== 'object') continue
    const from = cleanString(item.from, 40)
    const to = cleanString(item.to, 40)
    if (!characterIds.has(from) || !characterIds.has(to) || from === to) continue
    const key = `${from}>${to}`
    if (relationKeys.has(key)) continue
    relationKeys.add(key)
    relations.push({
      from,
      to,
      label: cleanString(item.label, 24) || '关系',
      strength: Math.round(clampNumber(item.strength, 1, 5, 1)),
    })
  }

  const metrics = []
  for (const item of Array.isArray(source.metrics) ? source.metrics.slice(0, MAX_METRICS) : []) {
    if (item === null || typeof item !== 'object') continue
    metrics.push({
      round: Math.round(clampNumber(item.round, 0, 99, metrics.length + 1)),
      aiScore: Math.round(clampNumber(item.aiScore, 0, 100, 0)),
      readability: Math.round(clampNumber(item.readability, 0, 100, 0)),
    })
  }
  metrics.sort((left, right) => left.round - right.round)

  const data = {
    title: cleanString(source.title, 60) || title,
    summary: cleanString(source.summary, 200),
    chapters,
    characters,
    relations,
    metrics,
    updatedAt: new Date().toISOString(),
  }
  if (data.summary.length === 0) data.summary = chartSummary(data)
  return data
}

/** Whether the payload has anything worth drawing. */
export function hasChartData(data) {
  return Boolean(data && ((Array.isArray(data.chapters) && data.chapters.length > 0)
    || (Array.isArray(data.characters) && data.characters.length > 0)))
}

/** Deterministic one-line reading of the story map. */
export function chartSummary(data) {
  if (!hasChartData(data)) return '还没有可绘制的数据：完成大纲或章纲后再来看看。'
  const parts = []
  if (data.chapters.length > 0) {
    const peak = data.chapters.reduce((best, item) => (item.tension > best.tension ? item : best), data.chapters[0])
    const avgHook = Math.round(data.chapters.reduce((sum, item) => sum + item.hook, 0) / data.chapters.length)
    parts.push(`已记录 ${data.chapters.length} 章，第 ${peak.no} 章张力最高（${peak.tension}），平均钩子强度 ${avgHook}`)
    const low = data.chapters.filter((item) => item.tension < 30)
    if (low.length >= 2) parts.push(`第 ${low.slice(0, 3).map((item) => item.no).join('、')} 章张力偏低，注意追读流失`)
  }
  if (data.characters.length > 0) {
    const named = data.characters.filter((item) => item.role === '主角').map((item) => item.name)
    parts.push(named.length > 0 ? `人物 ${data.characters.length} 人，主角 ${named.join('、')}` : `人物 ${data.characters.length} 人`)
  }
  if (data.relations.length > 0) parts.push(`关系 ${data.relations.length} 条`)
  if (data.metrics.length > 1) {
    const first = data.metrics[0]
    const last = data.metrics[data.metrics.length - 1]
    const delta = last.aiScore - first.aiScore
    parts.push(`AI 味得分从 ${first.aiScore} 变为 ${last.aiScore}（${delta >= 0 ? '改善' : '退步'}${Math.abs(delta)}）`)
  }
  return `${parts.join('；')}。`
}

/** A safe empty payload for the panel. */
export function emptyChartData(title = '未命名项目') {
  return { title, summary: chartSummary(null), chapters: [], characters: [], relations: [], metrics: [], updatedAt: null }
}
