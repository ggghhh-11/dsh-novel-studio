/**
 * Derive chart data from the chapters that already exist on disk.
 *
 * The model is supposed to submit a hand-curated story map, but in practice a
 * project often has ten written chapters and an empty chart. These helpers
 * estimate tension/hook from deterministic text metrics so the story map is
 * never blank; hand-curated values always win.
 */

import { scanText } from './scan.js'

const HOOK_MARKERS = /[？?…]|——|突然|竟然|却|难道|原来|没想到|除非|只有/u

function emotionOf(scan) {
  if (scan.dialogueRatio >= 0.3) return '对话密集'
  if (scan.shortRatio >= 0.35) return '短句急促'
  if (scan.longRatio >= 0.2) return '长句铺陈'
  return ''
}

/** Estimate per-chapter tension/hook/words from chapter text. */
export function deriveFromTexts(texts, reviewHistory = []) {
  const chapters = []
  const chapterMetrics = []
  for (const item of Array.isArray(texts) ? texts : []) {
    if (item === null || typeof item !== 'object') continue
    const text = typeof item.text === 'string' ? item.text : ''
    if (text.trim().length === 0) continue
    const no = Number.parseInt(String(item.no ?? ''), 10)
    if (!Number.isFinite(no) || no <= 0) continue
    const scan = scanText(text)
    const tail = text.slice(-160)
    const hook = Math.min(100, Math.round(
      45 + (HOOK_MARKERS.test(tail) ? 25 : 0) + (scan.shortRatio > 0.3 ? 10 : 0) + (scan.dialogueRatio > 0.2 ? 10 : 0),
    ))
    const tension = Math.min(100, Math.max(0, Math.round(
      40 + scan.dialogueRatio * 45 + scan.shortRatio * 20 + (scan.banned.length === 0 ? 5 : 0),
    )))
    chapters.push({
      no,
      title: '',
      words: scan.chars,
      tension,
      hook,
      emotion: emotionOf(scan),
      estimated: true,
    })
    chapterMetrics.push({ round: no, aiScore: scan.score, readability: scan.readability })
  }
  chapters.sort((left, right) => left.no - right.no)
  const history = (Array.isArray(reviewHistory) ? reviewHistory : [])
    .filter((item) => item?.scan && Number.isFinite(item.scan.score))
    .map((item) => ({
      round: Number.isFinite(item.round) ? item.round : 0,
      aiScore: item.scan.score,
      readability: Number.isFinite(item.scan.readability) ? item.scan.readability : 0,
    }))
  return {
    chapters,
    metrics: history.length > 0 ? history : chapterMetrics,
    estimated: true,
  }
}

/** Fill only the missing parts of a stored chart with derived data. */
export function mergeChartData(stored, derived) {
  const base = stored !== null && typeof stored === 'object' ? stored : {}
  const storedChapters = Array.isArray(base.chapters) ? base.chapters : []
  const storedMetrics = Array.isArray(base.metrics) ? base.metrics : []
  const derivedChapters = Array.isArray(derived?.chapters) ? derived.chapters : []
  const derivedMetrics = Array.isArray(derived?.metrics) ? derived.metrics : []
  const usedDerivedChapters = storedChapters.length === 0 && derivedChapters.length > 0
  const usedDerivedMetrics = storedMetrics.length === 0 && derivedMetrics.length > 0
  return {
    ...base,
    chapters: usedDerivedChapters ? derivedChapters : storedChapters,
    metrics: usedDerivedMetrics ? derivedMetrics : storedMetrics,
    estimated: usedDerivedChapters || usedDerivedMetrics,
  }
}
