/**
 * Deterministic AI-flavor and readability scanning.
 *
 * Nothing here calls a model: the same text always yields the same numbers, so
 * a rewrite gate can be enforced. Scores are 0–100, higher is better.
 */

/** Layered phrase list. `high` is the strongest AI tell, `mid` is mechanical. */
export const BANNED_PHRASES = [
  { phrase: '不禁', level: 'high', note: 'AI 高频副词，改为具体动作' },
  { phrase: '仿佛', level: 'mid', note: '比喻标记，密度过高显得空泛' },
  { phrase: '宛如', level: 'mid', note: '过熟比喻，换具体细节' },
  { phrase: '一抹', level: 'high', note: '模板化量词，改为具体描写' },
  { phrase: '一丝', level: 'high', note: '模板化量词' },
  { phrase: '嘴角微微上扬', level: 'high', note: ''},
  { phrase: '嘴角勾起', level: 'high', note: '' },
  { phrase: '空气中弥漫着', level: 'high', note: '' },
  { phrase: '五味杂陈', level: 'high', note: '情绪直述，改为动作/细节' },
  { phrase: '涌上心头', level: 'high', note: '情绪直述' },
  { phrase: '心中五味', level: 'high', note: '' },
  { phrase: '若有所思', level: 'high', note: '' },
  { phrase: '意味深长', level: 'high', note: '' },
  { phrase: '不易察觉', level: 'high', note: '' },
  { phrase: '微不可查', level: 'high', note: '' },
  { phrase: '几不可闻', level: 'high', note: '' },
  { phrase: '不知为何', level: 'high', note: '' },
  { phrase: '心中一动', level: 'high', note: '' },
  { phrase: '眼神复杂', level: 'high', note: '' },
  { phrase: '如释重负', level: 'mid', note: '' },
  { phrase: '心中一紧', level: 'high', note: '情绪直述' },
  { phrase: '心里一沉', level: 'high', note: '情绪直述' },
  { phrase: '怒火中烧', level: 'high', note: '' },
  { phrase: '感到一阵', level: 'high', note: '' },
  { phrase: '深吸一口气', level: 'mid', note: '' },
  { phrase: '缓缓开口', level: 'mid', note: '' },
  { phrase: '淡淡地说', level: 'mid', note: '' },
  { phrase: '然而', level: 'mid', note: '机械转折' },
  { phrase: '与此同时', level: 'mid', note: '机械转折' },
  { phrase: '不可否认', level: 'mid', note: '议论腔' },
  { phrase: '值得一提的是', level: 'mid', note: '议论腔' },
  { phrase: '总而言之', level: 'mid', note: '总结腔' },
  { phrase: '总的来说', level: 'mid', note: '总结腔' },
  { phrase: '这一切都', level: 'mid', note: '总结腔' },
  { phrase: '直到这一刻', level: 'mid', note: '总结腔' },
  { phrase: '从此', level: 'low', note: '时间跳跃套话' },
]

/** A small set of overused four-character idioms that flag templated prose. */
export const IDIOMS = [
  '不可思议', '恍然大悟', '不由自主', '不知所措', '如释重负', '心照不宣',
  '意味深长', '琳琅满目', '眼花缭乱', '目瞪口呆', '难以置信', '心满意足',
  '若无其事', '波澜不惊', '云淡风轻', '深不可测', '高深莫测', '不动声色',
]

const METAPHOR_MARKERS = ['仿佛', '宛如', '如同', '像是', '犹如', '好像', '似的']

const MAX_SCAN_CHARS = 200_000

function posixLines(text) {
  return text.split(/\r?\n/u)
}

function charCount(text) {
  return [...text].length
}

function splitSentences(text) {
  return text
    .split(/[。！？…!?]+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => charCount(sentence) > 0)
}

function dialogueChars(text) {
  let total = 0
  for (const match of text.matchAll(/[""「」『』]([^""「」『』]*?)[""「」『』]/gu)) {
    total += charCount(match[1])
  }
  return total
}

function countOccurrences(text, phrase) {
  if (phrase.length === 0) return 0
  let count = 0
  let index = 0
  while ((index = text.indexOf(phrase, index)) !== -1) {
    count += 1
    index += phrase.length
  }
  return count
}

function idiomCount(text) {
  let count = 0
  for (const idiom of IDIOMS) count += countOccurrences(text, idiom)
  return count
}

function repeatedOpenings(paragraphs) {
  const repeated = []
  let previous = ''
  let run = []
  for (const paragraph of paragraphs) {
    const opening = paragraph.slice(0, 2)
    if (opening.length < 2) continue
    if (opening === previous) {
      run.push(opening)
    } else {
      if (run.length >= 2) repeated.push(run[0])
      run = [opening]
      previous = opening
    }
  }
  if (run.length >= 2) repeated.push(run[0])
  return repeated
}

function summaryCandidates(paragraphs) {
  const candidates = []
  for (const paragraph of paragraphs) {
    if (/(总之|也就是说|原来|从此|直到这一刻|这一切|于是)/u.test(paragraph) && paragraph.length < 120) {
      candidates.push(paragraph.slice(0, 80))
    }
  }
  return candidates
}

function scoreOf(metrics) {
  let score = 100
  score -= metrics.bannedHigh * 3
  score -= metrics.bannedMid * 1.2
  score -= metrics.bannedLow * 0.4
  score -= metrics.longRatio * 25
  score -= Math.max(0, metrics.avgSentenceLength - 30) * 1.2
  // Ornate passages are allowed at peaks; only sustained, even density is penalized.
  score -= Math.max(0, metrics.idiomDensity - 12) * 0.9
  score -= Math.max(0, metrics.metaphorDensity - 14) * 1.1
  score -= metrics.repeatedOpenings.length * 4
  score -= metrics.summaryCandidates.length * 2
  return Math.max(0, Math.min(100, Math.round(score)))
}

function readabilityOf(metrics) {
  let score = 100
  score -= Math.max(0, metrics.avgSentenceLength - 26) * 1.8
  score -= metrics.longRatio * 35
  score -= Math.max(0, metrics.idiomDensity - 10) * 0.9
  score -= metrics.pronounDensity > 40 ? (metrics.pronounDensity - 40) * 1.1 : 0
  if (metrics.dialogueRatio < 0.06) score -= 8
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Scan a draft for AI-flavor and readability signals.
 * @param {string} text
 * @param {{ targetWords?: number }} options
 */
export function scanText(text, { targetWords } = {}) {
  const trimmed = typeof text === 'string' ? text : ''
  const clipped = trimmed.length > MAX_SCAN_CHARS ? trimmed.slice(0, MAX_SCAN_CHARS) : trimmed
  const chars = charCount(clipped)
  const lines = posixLines(clipped)
  const paragraphs = lines.map((line) => line.trim()).filter((line) => line.length > 0)
  const sentences = splitSentences(clipped)
  const lengths = sentences.map((sentence) => charCount(sentence))
  const totalSentenceChars = lengths.reduce((sum, value) => sum + value, 0)
  const avgSentenceLength = lengths.length === 0 ? 0 : totalSentenceChars / lengths.length
  const variance = lengths.length === 0
    ? 0
    : lengths.reduce((sum, value) => sum + (value - avgSentenceLength) ** 2, 0) / lengths.length
  const stdDev = Math.sqrt(variance)
  const shortCount = lengths.filter((value) => value <= 8).length
  const longCount = lengths.filter((value) => value >= 40).length
  const dialogue = dialogueChars(clipped)
  const idiomTotal = idiomCount(clipped)
  let metaphorTotal = 0
  for (const marker of METAPHOR_MARKERS) metaphorTotal += countOccurrences(clipped, marker)
  const pronounTotal = ['他', '她', '它', '他们', '她们', '它们', '这', '那']
    .reduce((sum, word) => sum + countOccurrences(clipped, word), 0)

  const perThousand = (value) => (chars === 0 ? 0 : (value * 1000) / chars)

  const banned = []
  let bannedHigh = 0
  let bannedMid = 0
  let bannedLow = 0
  for (const entry of BANNED_PHRASES) {
    const hitLines = []
    lines.forEach((line, index) => {
      if (line.includes(entry.phrase)) hitLines.push(index + 1)
    })
    const count = countOccurrences(clipped, entry.phrase)
    if (count === 0) continue
    banned.push({ phrase: entry.phrase, level: entry.level, count, lines: hitLines.slice(0, 12), note: entry.note })
    if (entry.level === 'high') bannedHigh += count
    else if (entry.level === 'mid') bannedMid += count
    else bannedLow += count
  }
  banned.sort((left, right) => (left.level === right.level ? right.count - left.count : left.level.localeCompare(right.level)))

  const paragraphLengths = paragraphs.map((paragraph) => charCount(paragraph))
  const avgParagraphChars = paragraphLengths.length === 0
    ? 0
    : paragraphLengths.reduce((sum, value) => sum + value, 0) / paragraphLengths.length
  const shortParagraphRatio = paragraphLengths.length === 0
    ? 0
    : paragraphLengths.filter((value) => value < 40).length / paragraphLengths.length

  const metrics = {
    bannedHigh,
    bannedMid,
    bannedLow,
    longRatio: lengths.length === 0 ? 0 : longCount / lengths.length,
    avgSentenceLength,
    avgParagraphChars,
    shortParagraphRatio,
    idiomDensity: perThousand(idiomTotal),
    metaphorDensity: perThousand(metaphorTotal),
    pronounDensity: perThousand(pronounTotal),
    dialogueRatio: chars === 0 ? 0 : dialogue / chars,
    repeatedOpenings: repeatedOpenings(paragraphs),
    summaryCandidates: summaryCandidates(paragraphs),
  }

  const score = scoreOf(metrics)
  const readability = readabilityOf(metrics)

  const suggestions = []
  if (bannedHigh > 0) suggestions.push(`删掉 ${bannedHigh} 处高 AI 味套话，换成人物动作或具体物象（如把"不禁一笑"改成"他把杯子放回桌面，指节敲了两下"）。`)
  if (metrics.longRatio > 0.15) suggestions.push('长句占比过高，插入 5–12 字的短句打断节奏。')
  if (avgSentenceLength > 32) suggestions.push('平均句长偏长，把转折处拆成两句，动作单独成句。')
  if (chars > 300 && avgParagraphChars < 35) suggestions.push('段落平均偏短：短段落本身适合网文，但关键场景可以补一点动作与人物反应，避免只罗列事件。')
  if (metrics.shortParagraphRatio > 0.5 && chars > 300) suggestions.push('过半段落不足 40 字：合并碎片段落或补足场景与人物反应，避免一句一段。')
  if (metrics.idiomDensity > 14) suggestions.push('四字成语密度偏高：如果全文都是这种密度，删一部分；高潮/转折处的铺陈可以保留。')
  if (metrics.metaphorDensity > 16) suggestions.push('比喻标记偏密：连续用过熟比喻的地方才需要删，局部华丽铺陈可以保留。')
  if (metrics.repeatedOpenings.length > 0) suggestions.push(`连续段落有相同开头（${metrics.repeatedOpenings.slice(0, 3).join('、')}），调整语序或视角。`)
  if (metrics.summaryCandidates.length > 0) suggestions.push('段末总结句偏多，删掉直接让场景收尾。')
  if (metrics.dialogueRatio < 0.05 && chars > 800) suggestions.push('对话占比几乎为零，考虑用对话带出信息与冲突。')
  if (readability < 60) suggestions.push('可读性偏低：拆长句、减少嵌套、把抽象词换成可感知的动作。')
  if (suggestions.length === 0) suggestions.push('整体干净：保持具体名词与动作，不要为了改而改。')

  const mustRewrite = []
  if (bannedHigh >= 3) mustRewrite.push('高 AI 味套话密集，必须成段重写而不是替换词语。')
  if (metrics.longRatio > 0.3) mustRewrite.push('超长句过多，必须整段拆分。')
  if (readability < 45) mustRewrite.push('可读性分过低，必须重写晦涩段落。')
  const overBrief = chars > 800 && avgParagraphChars < 25 && metrics.dialogueRatio < 0.08
  if (overBrief) suggestions.push('整体偏像事件提纲：网文短段落没问题，但如果通篇只有事件、没有场景与人物反应，可以考虑补几处关键场景。')

  return {
    chars,
    sentences: lengths.length,
    paragraphs: paragraphs.length,
    avgParagraphChars: Math.round(avgParagraphChars * 10) / 10,
    shortParagraphRatio: Math.round(shortParagraphRatio * 100) / 100,
    overBrief,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceStdDev: Math.round(stdDev * 10) / 10,
    shortRatio: lengths.length === 0 ? 0 : Math.round((shortCount / lengths.length) * 100) / 100,
    longRatio: Math.round(metrics.longRatio * 100) / 100,
    dialogueRatio: Math.round(metrics.dialogueRatio * 100) / 100,
    idiomDensity: Math.round(metrics.idiomDensity * 10) / 10,
    metaphorDensity: Math.round(metrics.metaphorDensity * 10) / 10,
    pronounDensity: Math.round(metrics.pronounDensity * 10) / 10,
    banned,
    repeatedOpenings: metrics.repeatedOpenings.slice(0, 8),
    summaryCandidates: metrics.summaryCandidates.slice(0, 8),
    score,
    readability,
    suggestions,
    mustRewrite,
    targetWords: Number.isInteger(targetWords) ? targetWords : null,
    wordDelta: Number.isInteger(targetWords) && targetWords > 0
      ? Math.round(((chars - targetWords) / targetWords) * 100)
      : null,
    truncated: trimmed.length > MAX_SCAN_CHARS,
  }
}

/** Compact one-line summary used by tool render and panel. */
export function summarizeScan(result) {
  const parts = [`AI 味 ${result.score}/100`, `可读性 ${result.readability}/100`, `${result.chars} 字`]
  if (result.wordDelta !== null) parts.push(`与目标偏差 ${result.wordDelta > 0 ? '+' : ''}${result.wordDelta}%`)
  if (result.banned.length > 0) parts.push(`${result.banned.length} 类套话`)
  return parts.join(' · ')
}

/** Which metrics a rewrite must not make worse. */
export function scanGate(result, threshold) {
  const failures = []
  if (result.score < threshold) failures.push(`AI 味得分 ${result.score} 低于阈值 ${threshold}`)
  if (result.readability < Math.max(50, threshold - 10)) failures.push(`可读性 ${result.readability} 偏低`)
  if (result.mustRewrite.length > 0) failures.push(...result.mustRewrite)
  return failures
}
