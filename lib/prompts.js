/**
 * Instruction builders for the drafting pipeline.
 *
 * Every builder returns model-facing text: requirements, the anti-AI-flavor
 * protocol, and the exact output path. The plugin never writes the prose
 * itself; it makes the constraints impossible to miss.
 */

import { renderTemplate } from './template.js'

/** The anti-AI-flavor writing protocol embedded in every generation step. */
export const BANNED_PHRASES = [
  '不禁', '仿佛', '宛如', '一丝', '一抹', '五味杂陈', '涌上心头', '若有所思', '意味深长',
  '不易察觉', '嘴角微微上扬', '空气中弥漫着', '心中一动', '眼神复杂', '深吸一口气',
  '缓缓开口', '从此', '总而言之', '总的来说', '这一切都',
]

export const ANTI_AI_RULES = [
  '【反 AI 味协议】',
  '1. 具体优先：写可被看见、听见、摸到的名词与动作，不写"感到/仿佛/不禁"这类转述。',
  '2. 情绪用行为承载：不直说"他很难过"，写他做了什么、停了多久、看哪里。',
  '3. 句式长短错落：长句之后允许 3–8 字的短句；不要每段都完整主谓宾。',
  '4. 允许口语碎片与不完整句，尤其在对话和人物心理里。',
  '5. 平段少用排比、四字成语堆叠、段末总结句；高潮或转折处可以用，但要有节制、服务于情绪。',
  '6. 比喻平段宁缺毋滥；情绪高点可以铺陈，但避免连续使用过熟、空泛的比喻。',
  '7. 对话要有潜台词：人物不把话说透，用停顿、反问、答非所问制造张力。',
  '8. 留白：该跳过的过程直接跳过，用一句结果代替三段过程。',
  '9. 视角一致：全程锁定已选视角，不随意进入他人内心。',
  `10. 禁止出现这些高频 AI 套话：${BANNED_PHRASES.join('、')}。`,
  '11. 辞藻要有节奏对比：绝大多数段落平实、克制；在高潮、转折、情绪爆发处允许铺陈华丽辞藻、排比、长句，但必须有铺垫与回落，不能通篇华丽。',
  '12. 长短由场景决定：该简的地方一句收住（一个动作、一个物件、一次沉默），该繁的地方再展开；不要把每段拉成同一长度。',
  '13. 华丽不等于堆形容词：即使铺陈，也优先用具体意象、动作、声音、气味，少用"璀璨、绝美、倾城"这类空泛大词。',
].join('\n')

function answersBlock(project) {
  const answers = project?.answers ?? {}
  const entries = Object.entries(answers)
  if (entries.length === 0) return '（用户未填写维度，按下面写法自行选择并保持全书一致）'
  return entries
    .map(([key, value]) => `- ${key}：${Array.isArray(value) ? value.join('、') : value}`)
    .join('\n')
}

function scaleBlock(project) {
  const answers = project?.answers ?? {}
  const chapterWords = project?.chapterWords ?? 2500
  const totalWords = Number(answers.totalWords ?? project?.totalWords ?? 0)
  const totalChapters = Number(answers.totalChapters ?? project?.totalChapters ?? 0)
  const lines = [`- 每章目标字数：${chapterWords}（±10%）`]
  if (totalWords > 0) lines.push(`- 全书目标字数：${totalWords}`)
  if (totalChapters > 0) lines.push(`- 全书目标章数：${totalChapters}`)
  if (totalWords > 0 && totalChapters === 0 && chapterWords > 0) {
    lines.push(`- 按每章 ${chapterWords} 字估算，约 ${Math.ceil(totalWords / chapterWords)} 章`)
  }
  return lines.join('\n')
}

function twistBlock(project) {
  const twist = Number.isFinite(project?.twist) ? project.twist : 30
  if (twist <= 20) return `【跳脱值 ${twist}/100 · 稳定】遵循类型惯例，优先满足读者预期，转折克制、有充分铺垫。`
  if (twist <= 50) return `【跳脱值 ${twist}/100 · 适度】在 1–2 个关键节点加入意外但合乎逻辑的转折，拒绝为反转而反转。`
  if (twist <= 80) return `【跳脱值 ${twist}/100 · 偏反套路】主动避开同题材最常见的桥段；每卷至少 2 次"意料之外、情理之中"的走向；所有反转必须有前文伏笔支撑。`
  return `【跳脱值 ${twist}/100 · 高反套路】强烈鼓励反常规：避开烂大街设定与爽点模板，给出意外但逻辑自洽的走向；每个反转必须能回溯到具体伏笔，禁止无因反转，同时保持人物动机可信。`
}

const HOOKS_COMMAND = '落盘后调用 `novel_studio(action=\'hooks\', hooks=[{"chapter":N,"title":"钩子名","type":"悬念|伏笔|反转|谜题","text":"具体内容","status":"open"}], resolved=[已回收钩子的 id])` 记录本章埋设/回收的钩子，供用户自查。'

/** Build the outline generation instruction. */
export function outlineInstructions(project, { file = 'novel/outline.md', outputMode = 'file', style = '' } = {}) {
  return [
    `# 任务：为《${project?.title ?? '未命名项目'}》生成全书大纲`,
    '',
    '## 已确认的创作设定',
    answersBlock(project),
    '',
    '## 篇幅参数',
    scaleBlock(project),
    '',
    '## 输出要求（按顺序写，缺一不可）',
    '1. 一句话故事（logline，30 字内）。',
    '2. 核心冲突：谁要什么、什么挡着、失败会失去什么。',
    '3. 结构模型：说明采用线性/双线/网状/环形/碎片中的哪一种，并画出 3–5 个阶段的推进。',
    '4. 主线与 1–2 条副线，以及它们在第几章交汇。',
    '5. 人物表：姓名、身份、欲望、恐惧、秘密、弧光（一句话）。',
    '6. 世界规则 3–5 条（现实题材写真实感锚点，幻想题材写代价与限制）。',
    '7. 主题与 2–3 个核心意象：意象如何随剧情变化。',
    '8. 开头方式与结尾方式：说明为什么这样开、这样收。',
    '9. 卷/章规划：若给了总字数或总章数，给出可执行的分卷表（每卷起止章、核心事件、卷末钩子）。',
    '10. 前 5 章的分章计划（每章一句话事件 + 章末钩子）。',
    '',
    '## 硬性约束',
    '- 大纲必须能直接拆成章纲，避免"主角逐渐成长"这类无法拆分的表述。',
    '- 每一卷至少一个"压抑—爆发"循环，每个循环有可见的代价。',
    '- 不写作者生平、读者接受史、市场分析这类非创作内容。',
    '',
    twistBlock(project),
    '',
    ...(style ? [style, ''] : []),
    ANTI_AI_RULES,
    '',
    `## 落盘`,
    `把完整大纲写入 TXT 文件 \`${file}\`，然后调用 \`novel_studio(action='output_done', kind='outline', file='${file}')\` 登记。登记后界面会自动打开文本预览；对话里只给一句摘要。`,
    outputMode === 'chat' ? '本项目的输出方式设置为「对话直出」：登记后在回复中完整贴出全文，不要省略。' : '',
    '随后调用 `novel_studio(action=\'chart\')` 提交章节/人物/关系数据，再进入章纲阶段。',
    HOOKS_COMMAND,
  ].filter((line) => line !== '').join('\n')
}

/** Build a batch chapter-outline instruction. */
export function chapterOutlineInstructions(project, { from = 1, count = 3, file = 'novel/chapters/ch001-003.outline.md', outputMode = 'file', style = '' } = {}) {
  const to = from + count - 1
  const chapterWords = project?.chapterWords ?? 2500
  return [
    `# 任务：为《${project?.title ?? '未命名项目'}》生成第 ${from}–${to} 章章纲（共 ${count} 章）`,
    '',
    '## 依据',
    `- 全书大纲：novel/outline.md（必须先读）`,
    `- 本批起始章：第 ${from} 章；结束章：第 ${to} 章`,
    `- 每章目标字数：${chapterWords}（±10%）`,
    '',
    '## 每章必须包含',
    '1. 章节号与 3 个候选标题（标题要有钩子、不剧透关键反转）。',
    '2. 核心事件：本章发生了什么不可逆的变化。',
    '3. 情节点 3–5 个，按顺序，每个一句话，写"谁做了什么、结果如何"。',
    '4. 视角与叙述距离：谁在看，贴多近。',
    '5. 场景清单 1–3 个：地点、时间、在场人物、场景目的。',
    '6. 章末钩子：卡在哪个信息差/危机/反转前，说明为什么读者会点下一章。',
    '7. 伏笔操作：埋什么、回收什么、保留什么。',
    '8. 字数分配：各情节点大致占比。',
    '',
    '## 批量要求',
    `- 连续写 ${count} 章，章与章之间必须有因果推进，不能每章重置。`,
    '- 每 3–5 章安排一次情绪峰值；峰值之间要有代价与喘息。',
    '- 章末钩子不得重复同一手法（连续三章不能都用"突然有人敲门"）。',
    '',
    twistBlock(project),
    '',
    ...(style ? [style, ''] : []),
    ANTI_AI_RULES,
    '',
    '## 落盘',
    `把本批章纲写入 TXT 文件 \`${file}\`，然后调用 \`novel_studio(action='output_done', kind='chapter_outline', file='${file}')\` 登记；界面会自动打开文本预览。`,
    outputMode === 'chat' ? '本项目为「对话直出」：登记后在回复中完整贴出全文。' : '',
    '随后调用 `novel_studio(action=\'chart\')` 更新图谱数据，再进入正文阶段。',
    HOOKS_COMMAND,
  ].filter((line) => line !== '').join('\n')
}

/** Build the draft instruction for one chapter. */
export function draftInstructions(project, { chapter = 1, chapterWords = 2500, file = 'novel/chapters/ch001.md', outputMode = 'file', style = '' } = {}) {
  return [
    `# 任务：写《${project?.title ?? '未命名项目'}》第 ${chapter} 章正文`,
    '',
    '## 依据',
    `- 章节号：第 ${chapter} 章；目标字数：${chapterWords}（±10%，低于 ${Math.round(chapterWords * 0.9)} 或高于 ${Math.round(chapterWords * 1.1)} 视为不达标）`,
    '- 必须先读：全书大纲、本章章纲、上一章正文（若有），保持人称、时态、称呼、道具连续。',
    '',
    '## 写法要求',
    '1. 开场 100 字内进入场景或冲突，不写天气铺垫。',
    '2. 场景按章纲执行，但允许为一个更好的细节微调；不得偏离核心事件。',
    '3. 对话占比建议 15%–45%；每段对话至少推进信息、暴露人物或制造张力之一。',
    '4. 章末必须落在钩子上，最后一句不总结、不升华。',
    '5. 保持视角锁定与称呼一致；时间、地点、伤口、道具不能与前文矛盾。',
    '6. 每 300–500 字至少一个具体感官细节或动作，避免连续抽象叙述。',
    '',
    '## 展开尺度（不过简，也不堆砌）',
    '1. 关键场景写透：用人物动作、对话、一两处必要的感官细节把冲突演出来；过渡场景一两句带过即可。',
    '2. 不要求每个情节点都展开成动作链，也不要用形容词和排比硬撑字数；描述以"读者能看见画面"为准。',
    '3. 对话可以短、可以片段化，符合网文习惯；但重要对话要有动作或停顿托住。',
    '4. 段落长短按网文节奏来：短段落没问题，要避免的是通篇只有事件罗列、没有场景与人物反应。',
    '5. 整章至少 2 处具体细节（环境/身体/物件），避免连续抽象叙述。',
    '6. 目标字数接近即可：低于下限时优先补关键场景与人物反应，而不是灌水重复。',
    '7. 不要写成"早上八点，公司只有我一个人。复印机预热，绿灯一闪一闪。"这种只有事件、没有人在场景里的提纲。',
    '8. 辞藻与节奏要有对比：平段克制；高潮、转折、情绪爆发处可以华丽铺陈（排比、比喻、长句），但要服务于情绪、前后有起伏；该简处一句收住，不要每段都一个密度。',
    '',
    twistBlock(project),
    '',
    ...(style ? [style, ''] : []),
    ANTI_AI_RULES,
    '',
    '## 落盘',
    `把正文写入 TXT 文件 \`${file}\`，调用 \`novel_studio(action='output_done', kind='draft', file='${file}')\` 登记（界面自动打开文本预览），再调用 \`novel_scan(file='${file}', targetWords=${chapterWords})\` 自查，然后进入审稿流程。`,
    outputMode === 'chat' ? '本项目为「对话直出」：登记后在回复中完整贴出正文，便于直接阅读。' : '',
    HOOKS_COMMAND,
  ].filter((line) => line !== '').join('\n')
}

/** Build the merge instruction after parallel reviews. */
export function mergeInstructions({ target = 'draft', roles = [], round = 1, rounds = 2 } = {}) {
  const roleNames = roles.map((role) => role.name).join('、')
  return [
    `# 任务：整合第 ${round}/${rounds} 轮审稿意见（对象：${target === 'outline' ? '大纲' : target === 'chapter_outline' ? '章纲' : '正文'}）`,
    '',
    `参与审稿的角色：${roleNames || '（本轮角色）'}`,
    '',
    '## 整合规则',
    '1. 去重：不同角色提出同一问题算一条，记录提出者数量。',
    '2. 优先级：blocker（逻辑硬伤/合规风险/严重 AI 味）> major（节奏、人物、结构问题）> minor（措辞建议）。',
    '3. 必修判定：≥2 个角色提出、或属于合规/逻辑/通顺度硬伤、或落在"必须人工重写"段落，一律必修。',
    '4. 冲突判定：意见互相矛盾时（如"加快节奏"vs"铺垫不足"），标注冲突并给出你的取舍理由，不静默忽略。',
    '5. 只保留可执行的意见：每条必须能定位到具体句子/段落，并给出改法。',
    '',
    '## 输出格式',
    '先输出一张修改清单表格（# / 位置 / 问题 / 严重度 / 提出者 / 改法），再输出改写后的完整文本。',
    '改写时保留原意与已成立的爽点，不做无关润色；改完必须调用 novel_scan 复扫。',
    '',
    `若本轮是第 ${rounds} 轮且仍有必修项，标记"未收敛"，不要假装完成。`,
  ].join('\n')
}

/** Build the rewrite instruction for a merged change list. */
export function reviseInstructions({ target = 'draft', mustFix = [], suggestions = [] } = {}) {
  const label = target === 'outline' ? '大纲' : target === 'chapter_outline' ? '章纲' : '正文'
  return [
    `# 任务：按修改清单改写${label}`,
    '',
    '## 必修项',
    ...(mustFix.length > 0 ? mustFix.map((item, index) => `${index + 1}. ${item}`) : ['（无可执行必修项；按建议项处理）']),
    '',
    '## 建议项',
    ...(suggestions.length > 0 ? suggestions.map((item, index) => `${index + 1}. ${item}`) : ['（无）']),
    '',
    '## 改写原则',
    '- 逐条落实必修项；建议项可取舍，但要在回复里说明哪条没采纳及原因。',
    '- 保留原有情节功能与人物动机，不擅自换剧情。',
    '- 重点消灭：套话、情绪直述、长句堆叠、段末总结、晦涩指代。',
    '- 改完后重新运行 novel_scan，指标必须优于上一版；不达标就继续改。',
  ].join('\n')
}

/** Human-readable project brief for tools and prompts. */
export function briefBlock(project) {
  return [
    `项目：${project?.title ?? '未命名'}`,
    `阶段：${project?.stage ?? 'intake'}`,
    `每章字数：${project?.chapterWords ?? 2500}`,
    `审稿轮次：${project?.rounds ?? 2}`,
    `已生成章节：${Array.isArray(project?.chapters) ? project.chapters.length : 0}`,
    '',
    '设定：',
    answersBlock(project),
    '',
    '模板参考：',
    renderTemplate({ full: false }).slice(0, 1200),
  ].join('\n')
}
