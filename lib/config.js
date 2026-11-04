/**
 * Configuration normalization for dsh-novel-studio.
 *
 * The profile patch carries a plain object; every value is clamped here so a
 * hand-edited patch can never put the plugin in an unusable state.
 */

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  autoAsk: true,
  defaultRounds: 2,
  roleSet: 'standard',
  scanThreshold: 70,
  projectDir: 'novel',
  maxChaptersPerOutline: 500,
  autoChart: true,
  autoHelp: false,
  language: 'zh',
})

const ROLE_SETS = new Set(['lean', 'standard', 'all'])
const LANGUAGES = new Set(['zh', 'en'])
const SAFE_DIR = /^[A-Za-z0-9._\u4e00-\u9fa5-]{1,64}$/

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1) return true
  if (value === 'false' || value === 0) return false
  return fallback
}

function asInteger(value, fallback, min, max) {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

/** Normalize the loader row's config into a usable settings object. */
export function normalizeConfig(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const warnings = []
  let projectDir = typeof source.projectDir === 'string' && SAFE_DIR.test(source.projectDir)
    ? source.projectDir
    : DEFAULT_CONFIG.projectDir
  if (projectDir !== source.projectDir && source.projectDir !== undefined) {
    warnings.push(`projectDir ${JSON.stringify(source.projectDir)} is not a safe directory name; using ${projectDir}`)
  }
  const roleSet = ROLE_SETS.has(source.roleSet) ? source.roleSet : DEFAULT_CONFIG.roleSet
  if (roleSet !== source.roleSet && source.roleSet !== undefined) {
    warnings.push(`roleSet ${JSON.stringify(source.roleSet)} is unknown; using ${roleSet}`)
  }
  const language = LANGUAGES.has(source.language) ? source.language : DEFAULT_CONFIG.language
  return {
    config: {
      enabled: asBoolean(source.enabled, DEFAULT_CONFIG.enabled),
      autoAsk: asBoolean(source.autoAsk, DEFAULT_CONFIG.autoAsk),
      defaultRounds: asInteger(source.defaultRounds, DEFAULT_CONFIG.defaultRounds, 0, 4),
      roleSet,
      scanThreshold: asInteger(source.scanThreshold, DEFAULT_CONFIG.scanThreshold, 50, 95),
      projectDir,
      maxChaptersPerOutline: asInteger(source.maxChaptersPerOutline, DEFAULT_CONFIG.maxChaptersPerOutline, 1, 500),
      autoChart: asBoolean(source.autoChart, DEFAULT_CONFIG.autoChart),
      autoHelp: asBoolean(source.autoHelp, DEFAULT_CONFIG.autoHelp),
      language,
    },
    warnings,
  }
}

/** Clamp a per-call chapter word target. */
export function clampChapterWords(value, fallback = 2500) {
  return asInteger(value, fallback, 800, 8000)
}

/** Clamp a per-call review round count. */
export function clampRounds(value, fallback = 2) {
  return asInteger(value, fallback, 0, 4)
}

/** Clamp a per-call outline batch count. The author decides the size; the cap is only a sanity bound. */
export function clampChapterCount(value, fallback = 3, max = 500) {
  return asInteger(value, fallback, 1, Math.min(500, max))
}

/** Clamp a per-call draft batch count (batch drafts are capped tightly). */
export function clampDraftCount(value, fallback = 1) {
  return asInteger(value, fallback, 1, 3)
}

/** Clamp the twist/anti-cliche dial (0 stable … 100 unexpected). */
export function clampTwist(value, fallback = 30) {
  return asInteger(value, fallback, 0, 100)
}
