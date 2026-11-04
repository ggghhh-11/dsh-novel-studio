/**
 * The creation template, filtered to dimensions the author can actually
 * decide while writing. Research/author-biography/reception dimensions are
 * intentionally absent: they are not inputs to drafting.
 *
 * Every render function is pure so the Host tool can return the same text a
 * unit test asserts.
 */

export const ROUTES = [
  {
    id: 'urban',
    label: '都市现实·冷峻中短篇',
    answers: { genre: '都市现实', length: '中短篇', platform: '纯文学', pov: '第三人称限知', tone: '冷峻克制', structure: '线性', chapterWords: 3000 },
  },
  {
    id: 'mystery',
    label: '悬疑推理·双线连载',
    answers: { genre: '悬疑推理', length: '长篇连载', platform: '番茄', pov: '第三人称限知', tone: '冷峻', structure: '双线', chapterWords: 2500 },
  },
  {
    id: 'xuanhuan',
    label: '玄幻修仙·长篇爽文',
    answers: { genre: '玄幻修仙', length: '长篇连载', platform: '起点', pov: '第三人称限知', tone: '热血', structure: '线性升级', chapterWords: 2500 },
  },
  {
    id: 'scifi',
    label: '科幻思辨·概念中篇',
    answers: { genre: '科幻', length: '中篇', platform: '纯文学', pov: '第三人称全知', tone: '冷静疏离', structure: '概念驱动', chapterWords: 3500 },
  },
  {
    id: 'romance',
    label: '言情·都市甜虐',
    answers: { genre: '言情', length: '长篇连载', platform: '晋江', pov: '第一人称限知', tone: '细腻', structure: '双线', chapterWords: 2500 },
  },
  {
    id: 'weird',
    label: '规则怪谈·无限流',
    answers: { genre: '规则怪谈', length: '长篇连载', platform: '番茄', pov: '第一人称限知', tone: '冷峻', structure: '单元+主线', chapterWords: 2500 },
  },
  {
    id: 'literary',
    label: '纯文学·期刊短篇',
    answers: { genre: '纯文学', length: '短篇', platform: '纯文学', pov: '第三人称限知', tone: '克制', structure: '碎片', chapterWords: 4000 },
  },
]

export const SECTIONS = [
  {
    id: 'A',
    title: '语言与文体',
    dims: [
      { id: 'A1', name: '语言风格', core: true, options: ['朴素', '华丽', '克制', '繁复', '抒情', '反讽', '口语', '书面', '冷峻', '温热', '透明', '阻拒'] },
      { id: 'A2', name: '词汇与句法', core: true, options: ['口语词', '书面词', '方言', '文白夹杂', '欧化长句', '翻译腔', '短句为主', '长句铺陈'] },
      { id: 'A3', name: '修辞', core: true, options: ['少比喻', '多比喻', '象征', '反讽', '夸张', '排比', '留白', '通感'] },
      { id: 'A4', name: '叙述语调', core: true, options: ['幽默', '悲悯', '嘲讽', '冷静', '煽情', '疏离'] },
      { id: 'A5', name: '对话', core: false, options: ['声音辨识度高', '潜台词', '短促', '绕弯子', '符合身份'] },
      { id: 'A6', name: '描写', core: false, options: ['白描', '心理描写', '环境描写', '感官描写', '细节克制'] },
      { id: 'A7', name: '文体混杂', core: false, options: ['书信', '日记', '档案', '新闻', '传奇', '寓言', '元小说'] },
      { id: 'A8', name: '语言创新性', core: false, options: ['形成独特文体', '克制模仿', '反套路'] },
    ],
  },
  {
    id: 'B',
    title: '叙事技术',
    dims: [
      { id: 'B1', name: '叙述视角', core: true, options: ['第一人称限知', '第三人称限知', '第三人称全知', '第二人称', '儿童视角', '动物视角', '死者视角'] },
      { id: 'B2', name: '聚焦与信息控制', core: true, options: ['读者先知道', '人物先知道', '同步揭示', '悬念前置', '信息层层剥开'] },
      { id: 'B3', name: '叙述者可靠性', core: true, options: ['可靠', '不可靠', '自我辩护', '隐瞒', '反讽'] },
      { id: 'B4', name: '叙事时间', core: true, options: ['顺叙', '倒叙', '插叙', '多时距', '重复叙述', '省略'] },
      { id: 'B5', name: '叙事层次', core: false, options: ['框架叙事', '套层结构', '元叙事', '多声部'] },
      { id: 'B6', name: '自由间接引语', core: false, options: ['大量使用', '少量点缀', '不用'] },
      { id: 'B7', name: '叙事节奏', core: false, options: ['快节奏', '慢节奏', '张弛交替', '概述多', '场景多'] },
      { id: 'B8', name: '叙事距离', core: false, options: ['贴近人物', '保持距离', '忽远忽近'] },
    ],
  },
  {
    id: 'C',
    title: '结构与组织',
    dims: [
      { id: 'C1', name: '整体结构', core: true, options: ['线性', '网状', '环形', '碎片', '双线', '多线', '复调'] },
      { id: 'C2', name: '章节安排', core: true, options: ['短章多', '长章少', '分卷', '标题党', '无标题'] },
      { id: 'C3', name: '开头与结尾', core: true, options: ['冷开场', '悬念开场', '日常开场', '封闭结局', '开放结局', '反高潮'] },
      { id: 'C4', name: '线索与伏笔', core: true, options: ['主线清晰', '多副线', '草蛇灰线', '伏笔集中回收'] },
      { id: 'C5', name: '因果链', core: false, options: ['严格因果', '允许巧合', '命运感'] },
      { id: 'C6', name: '统一性', core: false, options: ['形式内容统一', '允许断裂', '拼贴'] },
      { id: 'C7', name: '空间结构', core: false, options: ['地理空间', '社会空间', '心理空间', '多空间切换'] },
    ],
  },
  {
    id: 'D',
    title: '人物',
    dims: [
      { id: 'D1', name: '人物塑造', core: true, options: ['圆形人物', '扁平人物', '类型化', '个性化', '心理深度'] },
      { id: 'D2', name: '动机与行动', core: true, options: ['欲望驱动', '恐惧驱动', '矛盾动机', '被动人物'] },
      { id: 'D3', name: '人物弧光', core: true, options: ['成长', '堕落', '觉醒', '停滞'] },
      { id: 'D4', name: '人物关系', core: true, options: ['关系网络', '权力结构', '对照人物', '镜像人物'] },
      { id: 'D5', name: '人物声音', core: false, options: ['语言区分', '思维区分', '价值观区分'] },
      { id: 'D6', name: '群像塑造', core: false, options: ['主次分明', '群像并重', '社会覆盖面'] },
      { id: 'D7', name: '人物与主题', core: false, options: ['人物承载主题', '避免符号化'] },
    ],
  },
  {
    id: 'E',
    title: '情节与冲突',
    dims: [
      { id: 'E1', name: '故事性', core: true, options: ['强悬念', '强反转', '高张力', '生活流'] },
      { id: 'E2', name: '冲突类型', core: true, options: ['人与人', '人与社会', '人与自我', '人与自然', '人与命运'] },
      { id: 'E3', name: '情节逻辑', core: true, options: ['因果严谨', '允许反转', '拒绝降智'] },
      { id: 'E4', name: '节奏控制', core: true, options: ['高潮前置', '铺垫充分', '爆点密集', '留白'] },
      { id: 'E5', name: '结局质量', core: false, options: ['解决核心冲突', '开放', '升华', '反高潮'] },
      { id: 'E6', name: '可读性', core: false, options: ['低门槛', '高信息量', '阅读快感'] },
    ],
  },
  {
    id: 'F',
    title: '世界建构',
    dims: [
      { id: 'F1', name: '设定规则', core: true, options: ['现实真实感', '幻想自洽', '规则简单', '规则复杂'] },
      { id: 'F2', name: '社会制度', core: false, options: ['政治', '经济', '阶级', '法律', '宗教', '教育'] },
      { id: 'F3', name: '日常细节', core: true, options: ['物质生活', '风俗', '职业', '饮食', '空间'] },
      { id: 'F4', name: '真实感与陌生化', core: false, options: ['可信优先', '新鲜感优先', '两者兼顾'] },
      { id: 'F5', name: '设定服务性', core: false, options: ['推动情节', '服务主题', '只是背景'] },
    ],
  },
  {
    id: 'G',
    title: '主题与思想',
    dims: [
      { id: 'G1', name: '核心命题', core: true, options: ['爱', '死亡', '权力', '自由', '身份', '记忆', '阶级', '性别', '生态'] },
      { id: 'G2', name: '主题复杂性', core: true, options: ['多义', '辩证', '单一明确'] },
      { id: 'G3', name: '思想洞见', core: false, options: ['人性观察', '社会观察', '历史观察'] },
      { id: 'G4', name: '价值观与伦理', core: true, options: ['同情心', '道德困境', '拒绝说教', '保留偏见'] },
      { id: 'G5', name: '意识形态立场', core: false, options: ['明确立场', '保持暧昧', '多立场并置'] },
      { id: 'G6', name: '形式与主题结合', core: false, options: ['结构参与主题', '视角参与主题', '语言参与主题'] },
    ],
  },
  {
    id: 'H',
    title: '意象、象征与审美',
    dims: [
      { id: 'H1', name: '意象系统', core: true, options: ['物件意象', '颜色意象', '天气意象', '空间意象', '身体意象'] },
      { id: 'H2', name: '象征与隐喻', core: true, options: ['自然多义', '少量点睛', '拒绝图解'] },
      { id: 'H3', name: '母题与原型', core: false, options: ['旅程', '迷宫', '替身', '审判', '返乡'] },
      { id: 'H4', name: '审美风格', core: true, options: ['悲剧', '喜剧', '崇高', '怪诞', '荒诞', '抒情', '残酷'] },
      { id: 'H5', name: '情感效果', core: false, options: ['感染力', '共情', '疏离', '反讽', '悲悯'] },
      { id: 'H6', name: '氛围营造', core: false, options: ['恐怖', '怀旧', '孤独', '压迫', '梦幻'] },
    ],
  },
  {
    id: 'I',
    title: '细节与技巧',
    dims: [
      { id: 'I1', name: '细节选择', core: true, options: ['典型细节', '准确细节', '暗示性细节'] },
      { id: 'I2', name: '场景调度', core: true, options: ['镜头感', '空间走位', '场面感'] },
      { id: 'I3', name: '信息控制', core: false, options: ['延迟揭示', '提前埋点', '一次给足'] },
      { id: 'I4', name: '伏笔与呼应', core: false, options: ['前后照应', '草蛇灰线'] },
      { id: 'I5', name: '对话效率', core: false, options: ['推进情节', '揭示人物', '制造张力'] },
      { id: 'I6', name: '描写比例', core: false, options: ['叙述为主', '描写为主', '对话为主', '议论克制'] },
    ],
  },
  {
    id: 'J',
    title: '体裁与互文',
    dims: [
      { id: 'J1', name: '体裁规范', core: true, options: ['侦探', '科幻', '奇幻', '言情', '历史', '成长', '哥特'] },
      { id: 'J2', name: '类型创新', core: true, options: ['遵循类型', '突破类型', '混合类型'] },
      { id: 'J3', name: '互文性', core: false, options: ['神话引用', '经典改写', '历史文本', '流行文化'] },
      { id: 'J4', name: '戏仿与反讽', core: false, options: ['解构套路', '严肃戏仿', '避免'] },
      { id: 'J5', name: '跨媒介改编潜力', core: false, options: ['影视感', '游戏感', '图像小说感'] },
    ],
  },
  {
    id: 'K',
    title: '历史、社会与文化语境（作者可控部分）',
    dims: [
      { id: 'K1', name: '时代背景', core: true, options: ['当代', '近现代', '古代', '架空', '未来'] },
      { id: 'K2', name: '社会议题', core: true, options: ['阶级', '性别', '种族', '城乡', '移民', '战争', '生态'] },
      { id: 'K3', name: '文化身份', core: false, options: ['民族', '地方', '族群', '后殖民语境'] },
    ],
  },
  {
    id: 'O',
    title: '作者自检目标',
    dims: [
      { id: 'O1', name: '完成度', core: true, options: ['结构完整', '人物立住', '主题落实'] },
      { id: 'O2', name: '统一性', core: true, options: ['语言统一', '结构统一', '人物统一'] },
      { id: 'O3', name: '创新性', core: true, options: ['题材新', '形式新', '语言新', '思想新'] },
      { id: 'O4', name: '思想深度', core: false, options: ['提出真问题', '拒绝标准答案'] },
      { id: 'O5', name: '审美价值', core: false, options: ['独特美感', '情感经验'] },
      { id: 'O6', name: '可读性', core: false, options: ['好读', '耐读'] },
      { id: 'O7', name: '重读性', core: false, options: ['可再读', '多角度阐释'] },
      { id: 'O8', name: '伦理价值', core: false, options: ['尊重复杂性', '不简化他者'] },
    ],
  },
]

/** Flattened dimension lookup, used by tests and by answer handling. */
export const DIMENSIONS = SECTIONS.flatMap((section) =>
  section.dims.map((dim) => ({ ...dim, section: section.id, sectionTitle: section.title })),
)

/** Human-readable template. `full` renders every dimension. */
export function renderTemplate({ full = false } = {}) {
  const lines = ['# 小说创作模板（只保留作者可主观决定的部分）', '']
  for (const section of SECTIONS) {
    lines.push(`## ${section.id}、${section.title}`)
    for (const dim of section.dims) {
      if (!full && !dim.core) continue
      lines.push(`- ${dim.id} ${dim.name}：${dim.options.join(' / ')}`)
    }
    lines.push('')
  }
  lines.push('> 说明：作者生平、创作意图、读者接受史、批评史、市场与传播、文学史定位等不由作者主观决定的内容，已从模板中剔除。')
  return lines.join('\n')
}

/** The compact, numbered choice card shown right after enabling. */
export function renderChoiceCard({ chapterWords = 2500, rounds = 2 } = {}) {
  const lines = [
    '# 小说创作模板（精简版，可多选/自定义/直接贴大纲）',
    '',
    '## 路线预设（可多选，相容的会合并；也可跳过直接填下面的编号）',
  ]
  ROUTES.forEach((route, index) => {
    lines.push(`${index + 1}. ${route.label}`)
  })
  lines.push('')
  lines.push('## 关键维度（回复编号 + 选项，例如：A1 朴素、冷峻；B1 第三人称限知）')
  for (const section of SECTIONS) {
    const dims = section.dims.filter((dim) => dim.core)
    if (dims.length === 0) continue
    lines.push(`### ${section.id}、${section.title}`)
    for (const dim of dims) {
      lines.push(`${dim.id} ${dim.name}：${dim.options.join(' / ')}`)
    }
  }
  lines.push('')
  lines.push(`## 生成参数（默认值，可改）`)
  lines.push(`- 每章字数：${chapterWords}`)
  lines.push(`- 审稿轮次：${rounds}`)
  lines.push(`- 总字数 / 总章数：可选（例：总 100 万字、400 章）`)
  lines.push('')
  lines.push('你可以：① 选路线编号；② 按编号回答维度；③ 用自己的话描述想法；④ 直接提供你写好的大纲。')
  return lines.join('\n')
}

/** Render the route presets alone (used by the panel). */
export function renderRouteList() {
  return ROUTES.map((route, index) => `${index + 1}. ${route.label}`).join('\n')
}

/** Merge answer objects without mutating inputs. */
export function mergeAnswers(...parts) {
  const merged = {}
  for (const part of parts) {
    if (part === null || typeof part !== 'object' || Array.isArray(part)) continue
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        merged[key] = [...(Array.isArray(merged[key]) ? merged[key] : []), ...value]
      } else {
        merged[key] = value
      }
    }
  }
  return merged
}

/** Resolve route ids (array or comma string) into merged preset answers. */
export function applyRoutes(routeIds) {
  const list = Array.isArray(routeIds)
    ? routeIds
    : String(routeIds ?? '').split(/[,，\s]+/).filter(Boolean)
  const answers = {}
  const applied = []
  for (const token of list) {
    const index = Number.parseInt(token, 10)
    const route = Number.isInteger(index) && index >= 1 && index <= ROUTES.length
      ? ROUTES[index - 1]
      : ROUTES.find((item) => item.id === token)
    if (route === undefined) continue
    applied.push(route.label)
    Object.assign(answers, mergeAnswers(answers, route.answers))
  }
  return { answers, applied }
}

const PLATFORM_SWEET = /(番茄|起点|飞卢|纵横|七猫)/u
const LITERARY_GENRES = /(纯文学|严肃文学|散文|诗歌)/u
const SWEET_GENRES = /(玄幻|修仙|爽文|都市|系统|无限流|规则怪谈)/u

/**
 * Detect incompatible combinations the author should arbitrate.
 * @returns {string[]} human-readable conflict descriptions
 */
export function detectConflicts(answers) {
  const conflicts = []
  const value = (key) => String(answers?.[key] ?? '')
  if (/第一人称/u.test(value('pov')) && /全知/u.test(value('pov'))) {
    conflicts.push('叙述视角同时选了"第一人称"和"全知"，请二选一（或改成第一人称限知）。')
  }
  if (value('pov') === '' && /第二人称/u.test(value('pov'))) {
    conflicts.push('第二人称视角需要额外的叙述者动机，建议先确认叙述者是谁。')
  }
  if (LITERARY_GENRES.test(value('platform')) && SWEET_GENRES.test(value('genre'))) {
    conflicts.push('平台选了纯文学，但题材偏商业爽文；请确认目标读者，或改平台/改题材。')
  }
  if (PLATFORM_SWEET.test(value('platform')) && LITERARY_GENRES.test(value('genre'))) {
    conflicts.push('平台是商业网文站，题材却是纯文学；两者可以并存，但需要明确取舍。')
  }
  if (/短篇/u.test(value('length')) && Number(answers?.chapterWords) > 6000) {
    conflicts.push('短篇却把每章字数设到 6000 以上，建议缩小单章或改中篇。')
  }
  if (/长篇连载/u.test(value('length')) && Number(answers?.chapterWords) > 0 && Number(answers?.chapterWords) < 1500) {
    conflicts.push('长篇连载单章不足 1500 字，追读节奏会显得太碎，建议提高到 2000–3000。')
  }
  return conflicts
}

/** Render saved answers as a stable Markdown block. */
export function formatAnswers(answers) {
  if (answers === null || typeof answers !== 'object') return ''
  const keys = Object.keys(answers)
  if (keys.length === 0) return ''
  return keys.map((key) => `- ${key}：${Array.isArray(answers[key]) ? answers[key].join('、') : answers[key]}`).join('\n')
}
