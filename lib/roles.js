/**
 * The review bench: 30 platform/operations roles supplied by the user, plus
 * two craft roles added by this plugin (flow-readability and AI-flavor).
 *
 * A role is declarative data; the prompt is composed per review target so the
 * same role never sees a stale instruction. All ids are stable and referenced
 * by the presets below.
 */

const CRAFT = 'craft'
const PLATFORM = 'platform'
const BUSINESS = 'business'

/** @typedef {{ id: string, name: string, group: string, duty: string, focus: string[] }} ReviewRole */

/** Every role in the bench. */
export const ROLES = [
  { id: 'senior-editor', name: '资深签约编辑', group: PLATFORM, duty: '从平台方视角判断题材竞争力、开篇是否达标、有没有拒签风险。本质是"能不能签约"的门槛把关人。', focus: ['题材是否有清晰的读者群与卖点', '开篇三章能否留住目标读者', '是否存在明显拒签风险（同质化、节奏拖沓、开篇无冲突）', '签约后能否持续供给'] },
  { id: 'hook-pace-inspector', name: '爆款节奏质检员', group: PLATFORM, duty: '量化爽点密度，排查水剧情，保证"压抑—爆发"循环不断档。本质是管追读节奏。', focus: ['每章是否有可感知的推进或爽点', '压抑—爆发的循环是否断档', '是否有可删的水段落', '章末是否留下继续读的理由'] },
  { id: 'logic-auditor', name: '逻辑漏洞排查员', group: PLATFORM, duty: '盯人设一致性、力量体系、时间线、伏笔回收。本质是防长线崩盘与吃书。', focus: ['人物行为是否与前文人设一致', '力量/规则体系是否自洽', '时间线与空间位置是否矛盾', '伏笔是否按时回收或至少留线'] },
  { id: 'retention-calibrator', name: '追读率精密校准师', group: PLATFORM, duty: '比节奏质检更细，按 5 章为单元精密校准情绪峰值与悬念密度。本质是逐级防流失。', focus: ['以 5 章为单元检查情绪峰值分布', '悬念密度是否逐单元衰减', '单元结尾是否有足够钩子', '是否存在连续低能量章节'] },
  { id: 'compliance-officer', name: '平台合规风控员', group: PLATFORM, duty: '排查题材红线、价值观导向、AI 低质判定。本质是防锁章、防下架。', focus: ['题材与描写是否触碰常见平台红线', '价值观导向是否可能被判定为负面', '是否像低质 AI 生成文本', '是否有需要提前改写的敏感桥段'] },
  { id: 'soft-landing-designer', name: '低敏感内容软着陆设计师', group: PLATFORM, duty: '不是简单删改，而是在保留爽感的前提下把敏感内容换成合规写法。本质是合规前提下保住剧情张力。', focus: ['指出可改写而非删除的敏感段落', '给出保留张力的替代写法', '避免把冲突写成说教', '改后仍然好看'] },
  { id: 'reader-experience-officer', name: '核心读者视角体验官', group: PLATFORM, duty: '用真实读者感受模拟"看到第几章会想跳"，测的是代入感与弃书点。', focus: ['哪些段落会让读者跳读', '代入感在哪一章开始下降', '是否有让人出戏的用词或设定', '弃书点在第几章、为什么'] },
  { id: 'reader-psych-guide', name: '读者心理引导师', group: PLATFORM, duty: '管情绪曲线、拉仇恨的力度、避免圣母憋屈。本质是情绪爽点调度。', focus: ['情绪曲线是否合理', '仇恨/期待是否被有效建立与释放', '主角是否显得憋屈或圣母', '读者情绪是否被正确引导'] },
  { id: 'genre-vertical-judge', name: '赛道垂直评委', group: PLATFORM, duty: '掌握细分赛道的专属雷区与专属爽点。本质是品类审美把关。', focus: ['是否符合该赛道的核心爽点', '是否踩到该赛道的专属雷区', '赛道读者最在意的东西是否给足', '是否借用了其他赛道的不兼容套路'] },
  { id: 'chapter-title-hooker', name: '章节标题钩子设计师', group: PLATFORM, duty: '前置设计章节名与断章点，卡在最高潮处。本质是点击率与章末转化。', focus: ['章末断点是否卡在信息差/危机/爽点前', '章节名是否有点击欲且不剧透', '单章标题是否形成系列感', '每章结尾能否自然诱导下一章'] },
  { id: 'paid-read-psych', name: '付费阅读心理研究员', group: PLATFORM, duty: '锚定上架章的爆点位置，确保免费章不提前耗空吸引力。本质是首订留存。', focus: ['免费章是否过早耗空核心爽点', '上架章前后是否有足够的付费动机', '是否存在"免费看完就够"的完整感', '首订章是否有强钩子'] },
  { id: 'dual-audience-adapter', name: '男女读者双受众适配师', group: PLATFORM, duty: '修剪让另一性别读者直接划走的雷点，扩大受众盘。本质是扩大流量基数。', focus: ['是否有单一性别读者会直接划走的表达', '情感线与事业线比例是否失衡', '角色刻画是否刻板', '能否在不失核心的前提下扩大受众'] },
  { id: 'long-term-stickiness-operator', name: '长期粘性操盘手', group: PLATFORM, duty: '用长线大悬念、功能性配角、番外钩子留住老读者。本质是长线留存。', focus: ['是否有贯穿全书的大悬念', '功能性配角是否被浪费', '老读者是否有持续追更的理由', '长线伏笔是否在推进'] },
  { id: 'serial-fatigue-counselor', name: '长期连载反疲惫心理疏导师', group: PLATFORM, duty: '关注作者本人的写作状态，安排高光章节与阶段成就。本质是管人能不能写完。', focus: ['是否连续安排高难度章节导致作者透支', '是否缺少阶段性的高光/成就章节', '单章写作难度是否过高', '是否需要调整阶段目标'] },
  { id: 'algorithm-fit-optimizer', name: '算法适配优化师', group: PLATFORM, duty: '沉淀精准标签、规避标签混乱、不被判低质。本质是让算法找对推送人群。', focus: ['标签是否清晰一致', '是否有被判低质的内容特征', '关键词与题材是否匹配目标人群', '是否存在标签混乱'] },
  { id: 'cold-start-data-optimizer', name: '新书冷启动数据优化师', group: PLATFORM, duty: '盯前 3 万字的完读率、跳出率、互动率三大考核指标。本质是首轮流量池晋级。', focus: ['前 3 万字的完读率风险', '跳出率高的位置', '互动点（评论/投票）是否足够', '首轮流量池能否晋级'] },
  { id: 'differentiation-designer', name: '同赛道避卷差异化设计师', group: PLATFORM, duty: '在烂大街设定里加微小反转与记忆点，跳出同质化。本质是做出可选中的理由。', focus: ['设定与头部作品的重合度', '是否有可被记住的微小反转', '卖点是否一句话说清', '同质化段落如何差异化'] },
  { id: 'platform-campaign-catcher', name: '平台活动红利捕手', group: PLATFORM, duty: '对齐官方征文与扶持活动门槛，卡时间点放大招。本质是吃平台免费流量。', focus: ['是否可对齐平台活动/征文门槛', '是否有可蹭的题材风口', '更新节奏能否配合活动窗口', '活动期该放什么内容'] },
  { id: 'competitor-interception-operator', name: '竞品反向截流运营师', group: PLATFORM, duty: '承接爆款完本期的溢出读者、承接被爆款"憋屈剧情"气走的读者。本质是精准借流。', focus: ['能否承接同类爆款的溢出读者', '能否承接被同类作品憋屈剧情赶走的读者', '开篇是否给出替代性爽点', '差异化卖点是否前置'] },
  { id: 'competitor-analyst', name: '同品类竞品分析师', group: PLATFORM, duty: '对标头部作品的优劣与差评点，找赛道空白。本质是定位与机会识别。', focus: ['头部作品做对了什么', '头部作品差评集中在哪里', '赛道空白与机会点', '本项目应避开哪些正面竞争'] },
  { id: 'monetization-designer', name: '商业化变现设计师', group: BUSINESS, duty: '找自然广告位、高互动点、规避劝退节点。本质是免费阅读模式的收益最大化。', focus: ['是否存在自然的商业/广告位', '高互动点如何设计', '哪些节点会劝退付费意愿', '收益与体验是否平衡'] },
  { id: 'lifecycle-advisor', name: '全生命周期运营顾问', group: BUSINESS, duty: '管长篇承载上限、大结局收尾、系列化可能性。本质是一本书的完整商业周期。', focus: ['当前体量是否可持续', '大结局是否需要提前布局', '是否具备系列化/番外空间', '中后期是否有塌陷风险'] },
  { id: 'long-tail-planner', name: '完本长尾收益规划师', group: BUSINESS, duty: '世界观延展性、改编适配性、去版权风险。本质是完本后还能持续产出收益。', focus: ['世界观是否有延展空间', '改编适配性（影视/有声/漫改）', '版权风险点', '完本后长尾内容规划'] },
  { id: 'derivative-potential-assessor', name: '衍生二创潜力评估师', group: BUSINESS, duty: '找能剪成短视频的高能片段、可传播的口头禅。本质是站外二创反哺主站流量。', focus: ['哪些片段适合剪成短视频', '是否有可传播的口头禅/名场面', '角色是否具备二创友好度', '二创风险点'] },
  { id: 'backend-rule-adapter', name: '作家后台规则深度适配师', group: BUSINESS, duty: '用动态、配图、话题投票撬动后台加权与各项补贴。本质是把平台功能都用满。', focus: ['动态/配图/投票是否被利用', '后台可争取的加权与补贴', '更新与活动规则是否吃满', '运营动作是否可自动化'] },
  { id: 'efficiency-planner', name: '后续写作效率规划师', group: BUSINESS, duty: '评估产能上限、简化高难度剧情、拆成最小更新单元。本质是从"想得到"到"写得完"。', focus: ['当前产能与更新目标是否匹配', '哪些高难度剧情需要简化', '能否拆成更小的更新单元', '是否有可持续的写作节奏'] },
  { id: 'hiatus-risk-cover', name: '连载期断更风险兜底师', group: BUSINESS, duty: '储备万能过渡剧情、安全存稿、压缩单章耗时。本质是防断更保全勤。', focus: ['是否有可用的万能过渡剧情', '存稿/缓冲章是否足够', '单章耗时能否压缩', '断更风险最高的时段'] },
  { id: 'anti-piracy-planner', name: '防盗版防断更预案师', group: BUSINESS, duty: '规避真实人名地名品牌、备用剧情分支、防撞梗侵权。本质是防投诉与防被迫改稿。', focus: ['是否使用真实人名/地名/品牌', '是否有撞梗侵权风险', '是否需要备用剧情分支', '被迫改稿时的兜底方案'] },
  { id: 'ai-compliance-optimizer', name: 'AI 生成内容合规免检优化师', group: BUSINESS, duty: '在模板化桥段里加独家细节、标出必须人工写的核心段落。本质是保住原创度加权。', focus: ['哪些段落过于模板化', '哪些段落必须人工重写', '如何加入独家细节', '原创度风险点'] },
  { id: 'black-swan-cover', name: '极端黑天鹅风险兜底师', group: BUSINESS, duty: '备用主线版本、规避受管题材、预留可延展的剧情上限。本质是应对规则突变的最坏情况。', focus: ['是否有备用主线版本', '是否触碰可能被临时管制的题材', '剧情上限是否可延展', '最坏情况下如何降损'] },
  {
    id: 'flow-readability-auditor',
    name: '通顺度与可读性审校员',
    group: CRAFT,
    duty: '专门检测生成内容逻辑是否通顺、指代是否清楚、有没有晦涩难懂的地方。本质是保住"读得下去"。',
    focus: ['前后因果是否接得上，是否有断裂或跳跃', '时间、地点、人物动作是否矛盾', '代词与省略是否造成指代不清', '长句、嵌套从句、生僻词是否造成理解负担', '信息释放是否一次给太多或太少', '哪些句子需要拆短、换词或补一句过渡'],
  },
  {
    id: 'ai-flavor-hunter',
    name: 'AI 味猎手',
    group: CRAFT,
    duty: '专门抓"一眼 AI"的写法：套话、空泛抒情、机械转折、比喻堆砌、总结陈词、句式整齐划一。本质是让文本像人写的。',
    focus: ['命中禁用词/套话清单的位置', '是否有空泛的情绪直述而非动作细节', '转折与总结是否机械', '区分有效铺陈与无意义堆砌：高潮/转折处的华丽排比可以保留，平段堆砌才是要指出的', '句长与段落是否过于整齐', '哪些句子应删、应换具体细节'],
  },
]

export const ROLE_BY_ID = new Map(ROLES.map((role) => [role.id, role]))

/** Presets per review target. Every preset keeps both craft roles. */
const PRESETS = {
  outline: {
    standard: ['senior-editor', 'genre-vertical-judge', 'competitor-analyst', 'differentiation-designer', 'logic-auditor', 'lifecycle-advisor', 'ai-flavor-hunter', 'flow-readability-auditor'],
    lean: ['senior-editor', 'differentiation-designer', 'ai-flavor-hunter', 'flow-readability-auditor'],
  },
  chapter_outline: {
    standard: ['chapter-title-hooker', 'hook-pace-inspector', 'retention-calibrator', 'compliance-officer', 'reader-psych-guide', 'ai-flavor-hunter', 'flow-readability-auditor'],
    lean: ['hook-pace-inspector', 'chapter-title-hooker', 'ai-flavor-hunter', 'flow-readability-auditor'],
  },
  draft: {
    standard: ['senior-editor', 'hook-pace-inspector', 'logic-auditor', 'retention-calibrator', 'compliance-officer', 'reader-psych-guide', 'reader-experience-officer', 'chapter-title-hooker', 'dual-audience-adapter', 'ai-flavor-hunter', 'flow-readability-auditor'],
    lean: ['hook-pace-inspector', 'reader-experience-officer', 'ai-flavor-hunter', 'flow-readability-auditor'],
  },
}

const COMMERCIAL_ONLY = new Set([
  'paid-read-psych', 'algorithm-fit-optimizer', 'cold-start-data-optimizer', 'platform-campaign-catcher',
  'competitor-interception-operator', 'monetization-designer', 'long-tail-planner', 'derivative-potential-assessor',
  'backend-rule-adapter', 'hiatus-risk-cover', 'black-swan-cover', 'platform-campaign-catcher',
])

/** Roles that only make sense for a commercial web-serial route. */
export function isCommercialRole(role) {
  return role?.group === BUSINESS || COMMERCIAL_ONLY.has(role?.id)
}

/**
 * Choose the roles for one review round.
 * @param {{ target: string, roleSet?: string, custom?: string[], literary?: boolean }} options
 * @returns {{ id: string, name: string, group: string, duty: string, focus: string[] }[]}
 */
export function selectRoles({ target = 'draft', roleSet = 'standard', custom, literary = false } = {}) {
  let ids
  if (Array.isArray(custom) && custom.length > 0) {
    ids = custom.map((id) => String(id).trim()).filter(Boolean)
  } else if (roleSet === 'all') {
    ids = ROLES.map((role) => role.id)
  } else {
    const preset = PRESETS[target] ?? PRESETS.draft
    ids = preset[roleSet] ?? preset.standard
  }
  const selected = []
  const seen = new Set()
  for (const id of ids) {
    const role = ROLE_BY_ID.get(id)
    if (role === undefined || seen.has(role.id)) continue
    if (literary && isCommercialRole(role)) continue
    seen.add(role.id)
    selected.push(role)
  }
  // Both craft roles are mandatory: a review round without them can miss the
  // exact failure modes this plugin exists to catch.
  for (const roleId of ['ai-flavor-hunter', 'flow-readability-auditor']) {
    if (seen.has(roleId)) continue
    const role = ROLE_BY_ID.get(roleId)
    if (role !== undefined) {
      seen.add(roleId)
      selected.push(role)
    }
  }
  return selected
}

/** Resolve the English display target into a Chinese label. */
export function targetLabel(target) {
  if (target === 'outline') return '全书大纲'
  if (target === 'chapter_outline') return '章纲'
  return '正文'
}

/** Compose the full review prompt for one role and one target text. */
export function rolePrompt(role, { target = 'draft', file, content, platformHint = '' } = {}) {
  const label = targetLabel(target)
  const location = file
    ? `文件：${file}。请先用 read 工具读取该文件，再开始审查。`
    : '待审内容见下方'
  const contentBlock = typeof content === 'string' && content.trim().length > 0
    ? `\n\n--- 待审${label}开始 ---\n${content.trim()}\n--- 待审${label}结束 ---`
    : ''
  return [
    `你是一位「${role.name}」。`,
    `你的职责：${role.duty}`,
    '',
    `本次审查对象：${label}。${location}`,
    '',
    '审查重点：',
    ...role.focus.map((item, index) => `${index + 1}. ${item}`),
    ...(platformHint ? ['', '## 平台特别要求', platformHint] : []),
    '',
    '输出要求：只输出一个 JSON 对象，不要 Markdown 代码块，不要改写成稿，不要空泛评价。格式：',
    '{"role":"' + role.id + '","verdict":"pass|revise","mustFix":["..."],',
    '"findings":[{"severity":"blocker|major|minor","location":"章节/段落/句子定位","issue":"具体问题","why":"为什么是问题","fix":"可执行的修改方向"}]}',
    '',
    '规则：',
    '- 每条 finding 必须能定位到具体句子或段落，禁止"整体节奏偏慢"这类无法执行的空话。',
    '- 不要代写整段；最多给一句示例。',
    '- 如果确实没有该维度的问题，verdict 可以是 pass，但必须给出 1–2 条可选优化。',
    '- 你的身份决定视角，不要越权做其他角色的工作。',
    contentBlock,
  ].join('\n')
}

/** A short list for UI and cost hints. */
export function describeRoles(roles) {
  return roles.map((role) => `${role.name}(${role.id})`).join('、')
}
