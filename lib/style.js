/**
 * Author-style memory: deterministic diff between the model's draft and the
 * user's edited version, distilled into traits that later drafts can follow.
 *
 * The memory is profile-global (the author's habits survive across novels);
 * only a compact diff summary is stored, never the full text.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { BANNED_PHRASES } from './prompts.js'
import { readJson, readText, runtimePaths, writeJsonAtomic } from './store.js'

const MAX_PARAGRAPHS = 800
const MAX_SENTENCES = 200
const MAX_CHANGES = 20
const MAX_TRAITS = 40
const MAX_VOCAB = 30
const MAX_SAMPLES = 20

export function styleMemoryPath() {
  return path.join(runtimePaths().dir, 'style-memory.json')
}

/** Candidate originals for a revision, newest backups first. */
export function originalCandidates(paths, project, chapter) {
  const candidates = []
  const pushFile = (file) => {
    const text = readText(file, '')
    if (text.trim().length > 0) candidates.push({ text, file })
  }
  const versions = fs.existsSync(paths.versionsDir) ? fs.readdirSync(paths.versionsDir) : []
  const chapterNo = Number.isInteger(chapter) ? chapter : null
  if (chapterNo !== null) {
    const name = `第${String(chapterNo).padStart(3, '0')}章.txt`
    for (const file of versions.filter((item) => item.startsWith(`${name}.`)).sort().reverse()) {
      pushFile(path.join(paths.versionsDir, file))
    }
    pushFile(path.join(paths.chaptersDir, name))
  }
  const outputs = Array.isArray(project?.outputs) ? project.outputs : []
  for (let index = outputs.length - 1; index >= 0; index -= 1) {
    const entry = outputs[index]
    if (entry?.kind !== 'draft' || typeof entry.absPath !== 'string') continue
    const base = path.basename(entry.absPath)
    for (const file of versions.filter((item) => item.startsWith(`${base}.`)).sort().reverse()) {
      pushFile(path.join(paths.versionsDir, file))
    }
    pushFile(entry.absPath)
  }
  return candidates
}

function emptyMemory() {
  return { version: 1, enabled: true, updatedAt: null, samples: [], traits: [], vocab: [] }
}

function normalizeMemory(value) {
  const samples = Array.isArray(value?.samples)
    ? value.samples.filter((item) => item !== null && typeof item === 'object').slice(-MAX_SAMPLES)
    : []
  const traits = Array.isArray(value?.traits)
    ? value.traits.filter((item) => item !== null && typeof item === 'object' && typeof item.text === 'string').slice(0, MAX_TRAITS)
    : []
  const vocab = Array.isArray(value?.vocab)
    ? value.vocab.filter((item) => item !== null && typeof item === 'object' && typeof item.from === 'string' && typeof item.to === 'string').slice(0, MAX_VOCAB)
    : []
  return {
    version: 1,
    enabled: value?.enabled !== false,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : null,
    samples,
    traits,
    vocab,
  }
}

export function readStyleMemory() {
  return normalizeMemory(readJson(styleMemoryPath(), {}))
}

export function writeStyleMemory(memory) {
  const next = normalizeMemory(memory)
  writeJsonAtomic(styleMemoryPath(), next)
  return next
}

export function clearStyleMemory() {
  return writeStyleMemory(emptyMemory())
}

export function setStyleEnabled(enabled) {
  const memory = readStyleMemory()
  return writeStyleMemory({ ...memory, enabled: enabled !== false })
}

export function countChars(text) {
  return [...String(text ?? '')].filter((char) => !/\s/u.test(char)).length
}

export function splitParagraphs(text) {
  const lines = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.slice(0, MAX_PARAGRAPHS)
}

export function splitSentences(text) {
  const parts = String(text ?? '')
    .split(/(?<=[。！？!?；;…])/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length === 0) {
    const whole = String(text ?? '').trim()
    return whole.length > 0 ? [whole] : []
  }
  return parts.slice(0, MAX_SENTENCES)
}

function lcsPairs(a, b) {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) return []
  const width = m + 1
  const table = new Int32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const here = i * width + j
      if (a[i] === b[j]) table[here] = table[(i + 1) * width + j + 1] + 1
      else table[here] = Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }
  const pairs = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j])
      i += 1
      j += 1
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return pairs
}

function diffIndices(a, b) {
  const pairs = lcsPairs(a, b)
  const matchedA = new Set(pairs.map(([i]) => i))
  const matchedB = new Set(pairs.map(([, j]) => j))
  const removed = []
  const added = []
  for (let i = 0; i < a.length; i += 1) if (!matchedA.has(i)) removed.push(i)
  for (let j = 0; j < b.length; j += 1) if (!matchedB.has(j)) added.push(j)
  return { removed, added }
}

function similarity(a, b) {
  const left = [...String(a ?? '')].slice(0, 240)
  const right = [...String(b ?? '')].slice(0, 240)
  if (left.length === 0 || right.length === 0) return 0
  const pairs = lcsPairs(left, right)
  return (2 * pairs.length) / (left.length + right.length)
}

function clip(text, max = 240) {
  const chars = [...String(text ?? '')]
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : chars.join('')
}

function extractReplacement(before, after) {
  const a = [...String(before ?? '')]
  const b = [...String(after ?? '')]
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < a.length - prefix
    && suffix < b.length - prefix
    && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) suffix += 1
  const from = a.slice(prefix, a.length - suffix).join('').trim()
  const to = b.slice(prefix, b.length - suffix).join('').trim()
  if (from.length === 0 || to.length === 0 || from === to) return null
  if (from.length > 30 || to.length > 30) return null
  if (!/[\u4e00-\u9fa5A-Za-z]/u.test(from) || !/[\u4e00-\u9fa5A-Za-z]/u.test(to)) return null
  if (/^[\d\s\p{P}]+$/u.test(from) || /^[\d\s\p{P}]+$/u.test(to)) return null
  return { from, to }
}

function addVocab(map, from, to) {
  const key = `${from}\u0000${to}`
  const current = map.get(key) ?? { from, to, count: 0 }
  current.count += 1
  map.set(key, current)
}

function collectVocab(before, after, map) {
  const left = splitSentences(before)
  const right = splitSentences(after)
  if (left.length === 0 || right.length === 0) return
  const { removed, added } = diffIndices(left, right)
  const used = new Set()
  for (const i of removed) {
    let best = -1
    let bestScore = 0
    for (const j of added) {
      if (used.has(j)) continue
      const score = similarity(left[i], right[j])
      if (score > bestScore) {
        bestScore = score
        best = j
      }
    }
    if (best >= 0 && bestScore >= 0.45) {
      used.add(best)
      const pair = extractReplacement(left[i], right[best])
      if (pair !== null) addVocab(map, pair.from, pair.to)
    }
  }
}

function metricsOf(text) {
  const paragraphs = splitParagraphs(text)
  const sentences = paragraphs.flatMap((paragraph) => splitSentences(paragraph))
  const chars = countChars(text)
  const paragraphChars = paragraphs.reduce((sum, paragraph) => sum + countChars(paragraph), 0)
  const sentenceChars = sentences.reduce((sum, sentence) => sum + countChars(sentence), 0)
  const dialogueLines = paragraphs.filter((paragraph) => /[“”"「」『』]/u.test(paragraph)).length
  const ellipsis = (String(text).match(/…|\.\.\./gu) ?? []).length
  const dash = (String(text).match(/——|—/gu) ?? []).length
  const exclamation = (String(text).match(/！|!/gu) ?? []).length
  return {
    chars,
    paragraphs: paragraphs.length,
    sentences: sentences.length,
    avgParagraph: paragraphs.length > 0 ? paragraphChars / paragraphs.length : 0,
    avgSentence: sentences.length > 0 ? sentenceChars / sentences.length : 0,
    dialogueRatio: paragraphs.length > 0 ? dialogueLines / paragraphs.length : 0,
    ellipsis,
    dash,
    exclamation,
  }
}

/** Compare an original draft with the user's edited version. */
export function diffTexts(original, revised) {
  const before = splitParagraphs(original)
  const after = splitParagraphs(revised)
  const beforeMetrics = metricsOf(original)
  const afterMetrics = metricsOf(revised)
  const truncated = String(original).split('\n').filter((line) => line.trim().length > 0).length > MAX_PARAGRAPHS
    || String(revised).split('\n').filter((line) => line.trim().length > 0).length > MAX_PARAGRAPHS
  const { removed, added } = diffIndices(before, after)
  const usedAdded = new Set()
  const changes = []
  const vocabMap = new Map()
  const removedBanned = new Set()
  let touched = 0

  for (const i of removed) {
    let best = -1
    let bestScore = 0
    for (const j of added) {
      if (usedAdded.has(j)) continue
      const score = similarity(before[i], after[j])
      if (score > bestScore) {
        bestScore = score
        best = j
      }
    }
    if (best >= 0 && bestScore >= 0.4) {
      usedAdded.add(best)
      changes.push({ type: 'change', before: clip(before[i]), after: clip(after[best]) })
      touched += Math.max(countChars(before[i]), countChars(after[best]))
      for (const phrase of BANNED_PHRASES) {
        if (before[i].includes(phrase) && !after[best].includes(phrase)) removedBanned.add(phrase)
      }
      collectVocab(before[i], after[best], vocabMap)
    } else {
      changes.push({ type: 'remove', before: clip(before[i]), after: '' })
      touched += countChars(before[i])
    }
  }
  for (const j of added) {
    if (usedAdded.has(j)) continue
    changes.push({ type: 'add', before: '', after: clip(after[j]) })
    touched += countChars(after[j])
  }

  const vocab = [...vocabMap.values()].sort((a, b) => b.count - a.count).slice(0, MAX_VOCAB)
  const total = Math.max(1, beforeMetrics.chars, afterMetrics.chars)
  return {
    truncated,
    changes: changes.slice(0, MAX_CHANGES),
    vocab,
    stats: {
      changes: changes.length,
      addedChars: Math.max(0, afterMetrics.chars - beforeMetrics.chars),
      removedChars: Math.max(0, beforeMetrics.chars - afterMetrics.chars),
      charsBefore: beforeMetrics.chars,
      charsAfter: afterMetrics.chars,
      avgSentenceBefore: beforeMetrics.avgSentence,
      avgSentenceAfter: afterMetrics.avgSentence,
      avgParagraphBefore: beforeMetrics.avgParagraph,
      avgParagraphAfter: afterMetrics.avgParagraph,
      dialogueRatioBefore: beforeMetrics.dialogueRatio,
      dialogueRatioAfter: afterMetrics.dialogueRatio,
      punctuationBefore: { ellipsis: beforeMetrics.ellipsis, dash: beforeMetrics.dash, exclamation: beforeMetrics.exclamation },
      punctuationAfter: { ellipsis: afterMetrics.ellipsis, dash: afterMetrics.dash, exclamation: afterMetrics.exclamation },
      removedBanned: [...removedBanned],
      changeRatio: Math.min(1, touched / total),
    },
  }
}

/** Turn diff statistics into human-readable traits. */
export function deriveTraits(diff, evidence = '') {
  const stats = diff.stats
  const traits = []
  const push = (text, confidence) => traits.push({ text, evidence, confidence, source: 'rule' })
  const beforeS = stats.avgSentenceBefore
  const afterS = stats.avgSentenceAfter
  if (beforeS > 0 && afterS > 0) {
    if (afterS <= beforeS * 0.85) push(`偏好短句：平均句长从 ${beforeS.toFixed(1)} 降到 ${afterS.toFixed(1)}`, 0.8)
    else if (afterS >= beforeS * 1.15) push(`偏好长句：平均句长从 ${beforeS.toFixed(1)} 升到 ${afterS.toFixed(1)}`, 0.75)
  }
  const beforeP = stats.avgParagraphBefore
  const afterP = stats.avgParagraphAfter
  if (beforeP > 0 && afterP > 0) {
    if (afterP <= beforeP * 0.8) push(`偏好更短的段落：平均段长从 ${Math.round(beforeP)} 字降到 ${Math.round(afterP)} 字`, 0.75)
    else if (afterP >= beforeP * 1.2) push(`偏好更长的段落：平均段长从 ${Math.round(beforeP)} 字升到 ${Math.round(afterP)} 字`, 0.7)
  }
  const dialogueDelta = stats.dialogueRatioAfter - stats.dialogueRatioBefore
  if (dialogueDelta >= 0.1) push(`对话更多：对话行占比从 ${(stats.dialogueRatioBefore * 100).toFixed(0)}% 升到 ${(stats.dialogueRatioAfter * 100).toFixed(0)}%`, 0.75)
  else if (dialogueDelta <= -0.1) push(`叙述更多：对话行占比从 ${(stats.dialogueRatioBefore * 100).toFixed(0)}% 降到 ${(stats.dialogueRatioAfter * 100).toFixed(0)}%`, 0.7)
  if (stats.removedBanned.length >= 2) {
    push(`反感 AI 套话：删掉了 ${stats.removedBanned.slice(0, 6).join('、')}`, 0.85)
  }
  if (diff.vocab.length >= 2) {
    push(`用词替换：${diff.vocab.slice(0, 4).map((item) => `${item.from}→${item.to}`).join('、')}`, 0.8)
  }
  const beforePunct = stats.punctuationBefore
  const afterPunct = stats.punctuationAfter
  const sumPunct = (value) => value.ellipsis + value.dash + value.exclamation
  const beforeCount = sumPunct(beforePunct)
  const afterCount = sumPunct(afterPunct)
  if (beforeCount > 0 && Math.abs(afterCount - beforeCount) / beforeCount >= 0.3) {
    push(afterCount > beforeCount
      ? `标点更多：省略号/破折号/感叹号从 ${beforeCount} 处增到 ${afterCount} 处`
      : `标点更省：省略号/破折号/感叹号从 ${beforeCount} 处减到 ${afterCount} 处`, 0.65)
  }
  if (stats.charsBefore > 0) {
    const ratio = stats.charsAfter / stats.charsBefore
    if (ratio <= 0.9) push(`整体更简洁：改稿比原稿少 ${stats.removedChars} 字`, 0.7)
    else if (ratio >= 1.1) push(`整体更丰满：改稿比原稿多 ${stats.addedChars} 字`, 0.7)
  }
  return traits
}

function normalizeTrait(text) {
  return String(text ?? '').replace(/[\d.]+/gu, '').replace(/\s+/gu, '').slice(0, 40)
}

export function mergeTraits(existing, incoming) {
  const list = Array.isArray(existing) ? existing.map((item) => ({ ...item })) : []
  for (const trait of incoming) {
    const norm = normalizeTrait(trait.text)
    const hit = list.find((item) => {
      const other = normalizeTrait(item.text)
      if (other === norm) return true
      return other.length > 8 && norm.length > 8 && (other.startsWith(norm.slice(0, 12)) || norm.startsWith(other.slice(0, 12)))
    })
    if (hit !== undefined) {
      hit.text = trait.text
      hit.hits = (hit.hits ?? 1) + 1
      hit.confidence = Math.max(hit.confidence ?? 0.5, trait.confidence ?? 0.5)
      hit.updatedAt = new Date().toISOString()
    } else {
      const now = new Date().toISOString()
      list.push({
        id: crypto.randomUUID(),
        text: trait.text,
        evidence: trait.evidence ?? '',
        confidence: trait.confidence ?? 0.6,
        hits: 1,
        source: trait.source ?? 'rule',
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  return list
    .sort((a, b) => (b.hits ?? 1) - (a.hits ?? 1))
    .slice(0, MAX_TRAITS)
}

export function mergeVocab(existing, incoming) {
  const map = new Map()
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (typeof item?.from !== 'string' || typeof item?.to !== 'string') continue
    const key = `${item.from}\u0000${item.to}`
    const current = map.get(key) ?? { from: item.from, to: item.to, count: 0 }
    current.count += item.count ?? 1
    map.set(key, current)
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, MAX_VOCAB)
}

function hashOf(original, revised) {
  return crypto.createHash('sha256').update(`${original}\n---\n${revised}`, 'utf8').digest('hex').slice(0, 40)
}

/**
 * Learn from one revision.
 * @param {{ original: string, revised: string, meta?: object }} input
 */
export function learnFromRevision({ original, revised, meta = {} }) {
  if (typeof original !== 'string' || typeof revised !== 'string') {
    throw new Error('original and revised text are required')
  }
  if (countChars(revised) < 100) {
    throw new Error('改稿太短（少于 100 字），无法可靠比对')
  }
  const memory = readStyleMemory()
  const hash = hashOf(original, revised)
  if (memory.samples.some((sample) => sample.hash === hash)) {
    return { duplicate: true, unchanged: false, memory, stats: null, traits: [], vocab: [] }
  }
  const diff = diffTexts(original, revised)
  const unchanged = diff.changes.length === 0 && countChars(original) === countChars(revised)
  if (unchanged) {
    return { duplicate: false, unchanged: true, memory, stats: diff.stats, traits: [], vocab: [] }
  }
  const sample = {
    id: crypto.randomUUID(),
    hash,
    at: new Date().toISOString(),
    projectSlug: typeof meta.projectSlug === 'string' ? meta.projectSlug : '',
    chapter: Number.isInteger(meta.chapter) ? meta.chapter : null,
    label: typeof meta.label === 'string' ? meta.label.slice(0, 60) : '',
    stats: diff.stats,
    changes: diff.changes,
    vocab: diff.vocab,
    originalFile: typeof meta.originalFile === 'string' ? meta.originalFile : '',
    revisedFile: typeof meta.revisedFile === 'string' ? meta.revisedFile : '',
  }
  const traits = deriveTraits(diff, sample.id)
  const next = {
    ...memory,
    samples: [...memory.samples, sample].slice(-MAX_SAMPLES),
    traits: mergeTraits(memory.traits, traits),
    vocab: mergeVocab(memory.vocab, diff.vocab),
    updatedAt: new Date().toISOString(),
  }
  writeStyleMemory(next)
  return { duplicate: false, unchanged: false, truncated: diff.truncated, memory: next, sample, traits, vocab: diff.vocab, stats: diff.stats }
}

/** Prompt block injected into outline/chapter/draft instructions. */
export function styleBlock(memory = null) {
  const value = memory ?? readStyleMemory()
  if (value.enabled === false) return ''
  const traits = (value.traits ?? []).slice(0, 12).map((trait) => `- ${trait.text}`)
  const vocab = (value.vocab ?? []).slice(0, 8).map((item) => `- ${item.from} → ${item.to}`)
  if (traits.length === 0 && vocab.length === 0) return ''
  return [
    '## 作者风格记忆（来自用户亲自改稿，优先贴近）',
    ...traits,
    ...(vocab.length > 0 ? ['', '### 作者常用替换', ...vocab] : []),
    '',
    '说明：这些偏好来自用户改稿；与本章章纲、人物逻辑冲突时以剧情为准，不要为了贴合偏好牺牲情节。',
  ].join('\n')
}
