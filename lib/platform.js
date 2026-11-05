/**
 * Platform direction: per-platform writing and review guidance that is
 * injected into every generation and review prompt once the author picks a
 * platform. Static baselines are combined with the model's own findings
 * (project.platformGuidance) so the prompts follow the platform's taste.
 */

const GUIDES = {
  番茄: {
    label: '番茄（免费阅读）',
    reader: '手机碎片阅读、强节奏；前三章决定去留',
    writing: [
      '开篇 300 字内给出冲突、反常或强代入场景，不写天气与背景铺垫',
      '单章 2000 字左右，场景 1–2 个；设定边用边给，不整段解释',
      '每 800–1200 字一个小钩子；章末必须停在信息差、危机或反转前',
      '对话 25%–45%；少大段心理与环境描写，用动作和台词推进',
      '爽点/反转密度高，但每次爆发都要有代价，避免无脑爽',
    ],
    review: ['前 3 章完读率', '章末钩子强度', '爽点密度与水段', '标题/简介点击欲'],
    roleHints: {
      'hook-pace-inspector': '番茄是手机碎片阅读：每 800–1200 字必须有一个小钩子，章末必须是强钩；直接指出可删的水段。',
      'compliance-officer': '番茄审核偏严：重点查低俗擦边、血腥、价值观导向与 AI 低质特征。',
      'chapter-title-hooker': '番茄标题决定点击：标题要有具体冲突/反差，不剧透关键反转。',
    },
  },
  起点: {
    label: '起点（付费订阅）',
    reader: '付费订阅、长线追更；读者吃设定与升级',
    writing: [
      '开篇 3 章内立住主角目标与第一个爽点或危机',
      '单章 2500–3000 字；每章至少一次明确收益、推进或反转',
      '力量/等级/规则体系自洽，升级有代价与门槛',
      '付费章前留强钩；免费章不要过早耗尽核心爽点',
      '长线伏笔要记录，避免吃书',
    ],
    review: ['设定自洽', '升级节奏', '付费动机', '同质化'],
    roleHints: {
      'logic-auditor': '起点是长线连载：重点查力量体系、等级、时间线是否吃书，伏笔是否按时回收。',
      'paid-read-psych': '起点付费模式：检查免费章是否过早耗尽爽点、上架章是否有足够付费动机。',
    },
  },
  晋江: {
    label: '晋江（女性向）',
    reader: '女性向、人物与情感驱动；对文笔和雷点敏感',
    writing: [
      '开篇尽快建立人物关系与情感张力，不靠设定堆砌',
      '单章 2500 字左右；心理与对话可以细，但要有动作托住',
      '关系推进要有层次与边界感，避免突兀',
      '注意视角统一、人称一致、称呼随关系变化',
      '避开常见雷点：人设崩坏、强行误会、工具人配角',
    ],
    review: ['关系线', '人物弧光', '雷点', '文笔'],
    roleHints: {
      'reader-experience-officer': '晋江读者对雷点极敏感：重点查人设崩坏、情感线突兀、视角混乱、强行误会。',
      'dual-audience-adapter': '晋江以女性读者为主：检查是否有多余的男性凝视或刻板描写。',
    },
  },
  知乎盐选: {
    label: '知乎盐选（短篇）',
    reader: '短篇、强钩子；前三段决定去留',
    writing: [
      '开篇第一段给出一句话钩子（反常/悬念/强冲突）',
      '短篇 1–3 万字；每一节都要有推进或反转',
      '第一人称或强代入视角，信息控制紧',
      '反转要前置伏笔、逻辑闭环，不能为反转而反转',
      '结尾留余味或二次反转，避免总结升华',
    ],
    review: ['前三段', '反转合理性', '代入感', '结尾余味'],
    roleHints: {
      'chapter-title-hooker': '盐选短篇：标题与前三段决定点击，重点查开篇钩子与反转前置。',
      'retention-calibrator': '盐选读者随时划走：每节结尾都要有继续读的理由。',
    },
  },
  纯文学: {
    label: '纯文学（期刊/出版）',
    reader: '期刊/出版向；语言、结构与主题优先',
    writing: [
      '语言准确、克制，允许留白与不确定',
      '结构服务主题，不套网文章末钩子',
      '人物复杂，避免功能化与标签化',
      '细节具体，象征自然生成，不图解主题',
      '不写商业运营、流量、爽点这类内容',
    ],
    review: ['语言', '结构', '主题', '细节'],
    roleHints: {},
  },
  暂不指定: {
    label: '暂不指定（通用）',
    reader: '先按题材惯例写，确定平台后再调整',
    writing: [
      '按题材惯例控制节奏与篇幅',
      '开篇尽快建立冲突或悬念',
      '保持人物与设定自洽',
      '章末留继续读的理由，但不套固定钩子',
    ],
    review: ['题材惯例', '人物与设定', '节奏', '可读性'],
    roleHints: {},
  },
}

const FALLBACK = GUIDES['暂不指定']
const MAX_GUIDANCE = 8
const MAX_GUIDANCE_CHARS = 120

export function platformGuide(platform) {
  return GUIDES[platform] ?? FALLBACK
}

function guidanceOf(project) {
  const value = Array.isArray(project?.platformGuidance) ? project.platformGuidance : []
  return value
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, MAX_GUIDANCE_CHARS))
    .slice(0, MAX_GUIDANCE)
}

/** Render the platform block injected into generation and review prompts. */
export function platformBlock(project) {
  const platform = typeof project?.platform === 'string' ? project.platform.trim() : ''
  if (platform.length === 0) return ''
  const guide = platformGuide(platform)
  const guidance = guidanceOf(project)
  const lines = [
    `## 平台风向：${guide.label}`,
    `- 读者预期：${guide.reader}`,
    '- 本文必须做到：',
    ...guide.writing.map((item, index) => `  ${index + 1}. ${item}`),
  ]
  if (guidance.length > 0) {
    lines.push(
      '- 当前风向 / 作者补充（来自平台检索与判断）：',
      ...guidance.map((item) => `  - ${item}`),
    )
  }
  lines.push(`- 平台审稿重点：${guide.review.join('、')}`)
  lines.push('说明：平台偏好优先于通用写法；与人物逻辑、本章章纲冲突时以剧情为准。')
  return lines.join('\n')
}

/** A per-role platform requirement, or '' when the role has none. */
export function platformRoleHint(role, platform) {
  const guide = platformGuide(platform)
  return guide.roleHints?.[role?.id] ?? ''
}

/** Lightweight data for the panel. */
export function platformSummary(platform) {
  const guide = platformGuide(platform)
  return {
    platform: typeof platform === 'string' ? platform : '',
    label: guide.label,
    writing: guide.writing,
    review: guide.review,
  }
}
