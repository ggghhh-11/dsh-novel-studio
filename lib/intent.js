/**
 * Creation-intent detection and simple answer helpers.
 *
 * Detection is deliberately conservative: a false positive pops a modal
 * question in the middle of unrelated work, so developer/research context
 * words veto a match. Every function here is pure and unit-tested.
 */

const POSITIVE_PATTERNS = [
  /我?想写(?:一部|一个|一本|个|部|本)?(?:[\u4e00-\u9fa5]{0,8})?(?:小说|故事|书)/,
  /(?:帮我|帮忙|给我)写(?:一部|一个|一本|个|部|本)?(?:[\u4e00-\u9fa5]{0,8})?(?:小说|故事|书)/,
  /(?:我要|想要|准备|打算|计划)写(?:一部|一个|一本|个|部|本)?(?:[\u4e00-\u9fa5]{0,8})?(?:小说|故事|书)/,
  /写(?:一部|一个|一本)(?:[\u4e00-\u9fa5]{0,8})?(?:小说|故事|书)/,
  /开(?:个)?新(?:书|坑)/,
  /小说创作/,
  /继续写(?:小说|故事|书)/,
  /写(?:个|一个|一部)长篇/,
  /(?:start|write)\s+(?:a\s+)?(?:novel|fiction|story)/i,
  /(?:begin|start)\s+(?:a\s+)?new\s+(?:novel|book)/i,
]

const DEV_CONTEXT = /(插件|工具|脚本|开发|实现|代码|源码|harness|dsh|DSH|功能|接口|API|调试|安装|配置|报错|文档|README|github)/u
// A research verb leading the message ("分析这本小说") is not a creation
// request; the same word inside a premise ("一部关于记忆研究的小说") is.
const META_LEAD = /^(?:请|帮我|帮忙|麻烦|你能|可以)?\s*(?:分析|评价|点评|评论|拆解|研究|赏析|解读|考据|书评)/u

const MAX_TEXT = 500

/** Extract the last human-authored text from a pre-step message batch. */
export function lastHumanText(messages) {
  if (!Array.isArray(messages)) return ''
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user' || message?.source?.kind !== 'user') continue
    if (!Array.isArray(message.content)) return ''
    const text = message.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim()
    return text
  }
  return ''
}

/** Whether a pre-step batch carries real human input. */
export function hasHumanMessage(messages) {
  if (!Array.isArray(messages)) return false
  return messages.some((message) => message?.role === 'user' && message?.source?.kind === 'user')
}

/**
 * Decide whether text expresses "I want to write fiction".
 * @returns {{ matched: boolean, reason: string }}
 */
export function detectCreationIntent(text) {
  const value = String(text ?? '').trim()
  if (value.length < 2) return { matched: false, reason: 'empty' }
  if (value.length > MAX_TEXT) return { matched: false, reason: 'too-long' }
  if (DEV_CONTEXT.test(value)) return { matched: false, reason: 'developer-context' }
  if (META_LEAD.test(value)) return { matched: false, reason: 'meta-context' }
  const positive = POSITIVE_PATTERNS.some((pattern) => pattern.test(value))
  if (!positive) return { matched: false, reason: 'no-pattern' }
  return { matched: true, reason: 'matched' }
}

/** Whether a closed answer means "enable". */
export function answerMeansEnable(answer) {
  const answers = Array.isArray(answer?.answers) ? answer.answers : []
  const item = answers[0]
  if (item === null || typeof item !== 'object') return false
  const selected = Array.isArray(item.selected) ? item.selected.filter((value) => typeof value === 'string') : []
  if (selected.some((value) => /不启用|暂不|否|skip|later/i.test(value))) return false
  if (selected.some((value) => /启用|开始|是|enable|start/i.test(value))) return true
  const custom = typeof item.custom === 'string' ? item.custom.trim() : ''
  if (custom.length === 0) return false
  if (/(暂不|不启用|不用|先不|不要)/u.test(custom)) return false
  return /(启用|开始|可以|好|是|行|enable|yes)/i.test(custom)
}

/** Whether text is an explicit manual enable instruction inside a chat. */
export function isManualEnableText(text) {
  const value = String(text ?? '')
  return /(启用|打开|开启|进入).{0,8}(小说|创作|工作台)/u.test(value) || /(使用|调用).{0,8}小说工作台/u.test(value)
}
