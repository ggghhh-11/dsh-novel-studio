/**
 * Revision impact analysis: when the author rewrites a chapter, the change may
 * imply an outline change. These prompts make the model decide that explicitly
 * instead of silently learning style and moving on.
 */

const MAX_MATERIAL = 9000

function clip(text, max = MAX_MATERIAL) {
  const chars = [...String(text ?? '')]
  return chars.length > max ? `${chars.slice(0, max).join('')}\n…（已截断）` : chars.join('')
}

function hookLines(hooks) {
  return (Array.isArray(hooks) ? hooks : [])
    .slice(-24)
    .map((hook) => `- 第 ${hook.chapter ?? '?'} 章｜${hook.type ?? '悬念'}｜${hook.title ?? ''}｜${hook.status === 'resolved' ? '已回收' : '未回收'}`)
}

/** Prompt asking the model to compare a revision against the outline. */
export function buildRevisionImpactPrompt({
  title = '未命名项目',
  chapter = 0,
  original = '',
  revised = '',
  outline = '',
  chapterOutline = '',
  hooks = [],
  platform = '',
} = {}) {
  return [
    `# 任务：判断用户对第 ${chapter} 章的修改是否改变了全书大纲`,
    `项目：《${title}》${platform ? `（${platform}）` : ''}`,
    '',
    '## 原稿',
    clip(original),
    '',
    '## 用户改稿',
    clip(revised),
    '',
    '## 当前全书大纲',
    clip(outline) || '（还没有全书大纲）',
    '',
    '## 当前章纲',
    clip(chapterOutline) || '（没有找到本章章纲）',
    '',
    '## 已记录钩子',
    ...(hookLines(hooks).length > 0 ? hookLines(hooks) : ['（无）']),
    '',
    '## 判断标准（区分润色与设定变更）',
    '1. 文字润色、节奏、描写、对话调整 → 不算大纲变化。',
    '2. 人物生死、身份、立场、核心关系、目标改变 → 算。',
    '3. 关键事件、地点、时间线、因果链改变 → 算。',
    '4. 伏笔新增/回收/删除，主线/副线推进改变 → 算。',
    '5. 卷章结构、结局方向改变 → 算。',
    '',
    '## 输出',
    '只输出一个 JSON 对象：',
    '{"hasOutlineImpact":true|false,"confidence":0-1,"impacts":[{"type":"...","severity":"blocker|major|minor","evidenceBefore":"...","evidenceAfter":"...","outlineEffect":"..."}],"suggestedOutlineChanges":["..."],"reason":"..."}',
    '',
    '## 后续流程（必须遵守）',
    '1. 若有影响：先用 ask_user_question 问用户「这次改动是否同步修改大纲？」',
    '   选项：① 只学习写作习惯，不改大纲 ② 同步修改大纲。',
    '2. 用户选「只学习写作习惯」：保留 learn_style 的结果，不做其他处理。',
    '3. 用户选「同步修改大纲」：调用 novel_studio(action=\'outline_revision\', impacts=<上面的 JSON>, chapter=...) 获取修订指令。',
    '4. 生成新大纲后：先问用户是否符合预期；确认后再问用哪些子智能体审校（默认大纲组 / 全开 32 / 精简），再调用 review_plan(target=\'outline\', roles=[...])。',
  ].join('\n')
}

/** Prompt for producing a revised outline from an impact report. */
export function buildOutlineRevisionPrompt({
  title = '未命名项目',
  chapter = 0,
  outline = '',
  revised = '',
  impacts = null,
} = {}) {
  return [
    `# 任务：根据用户对第 ${chapter} 章的修改，更新《${title}》的全书大纲`,
    '',
    '## 当前全书大纲（必须完整阅读）',
    clip(outline) || '（还没有大纲，可基于改稿重新生成）',
    '',
    '## 用户改稿（节选）',
    clip(revised) || '（未提供改稿文本，请以影响分析为准）',
    '',
    '## 大纲影响分析',
    typeof impacts === 'string' ? impacts : JSON.stringify(impacts ?? {}, null, 2),
    '',
    '## 修改要求',
    '1. 只改受影响的设定、事件、关系、伏笔、卷章规划；未受影响的部分原样保留。',
    '2. 输出**完整的新大纲**，不是 diff，结构沿用原大纲。',
    '3. 末尾附「本次变更」清单（3–8 条），说明改了什么、为什么。',
    '4. 不要改正文；不要改变视角/文风等与大纲无关的东西。',
    '',
    '## 落盘',
    '把新大纲全文传给 `novel_studio(action=\'outline_apply\', outlineText=..., note=\'根据第 N 章改稿更新\')` 保存。',
    '保存后先问用户是否符合预期；确认后再问用哪些子智能体审校。',
  ].join('\n')
}
