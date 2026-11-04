/**
 * First-run intake: the questions every new novel project must answer.
 *
 * The host asks these at the pause-free enable step, so the model cannot
 * "forget" platform, style, reviewer set or twist. Parsing is pure and
 * unit-tested.
 */

export const INTAKE_REVIEW_DEFAULT = '默认子集（推荐）'
export const INTAKE_REVIEW_ALL = '全开 32 个'
export const INTAKE_REVIEW_LATER = '稍后在侧边栏自选'

/** Build the multi-question card shown right after the user enables the studio. */
export function buildIntakeQuestions() {
  return [
    {
      id: 'title',
      header: '书名',
      question: '这本书叫什么？（可留空，之后再改）',
      options: [{ label: '暂不命名', description: '先用"未命名小说"占位' }],
    },
    {
      id: 'platform',
      header: '发表平台',
      question: '你打算在哪个平台发表？',
      options: [
        { label: '番茄', description: '免费阅读、强节奏' },
        { label: '起点', description: '付费订阅、男频为主' },
        { label: '晋江', description: '女性向、情感与人物' },
        { label: '知乎盐选', description: '短篇、强钩子' },
        { label: '纯文学', description: '期刊/出版向' },
        { label: '暂不指定', description: '先按通用路线写' },
      ],
    },
    {
      id: 'genre',
      header: '题材 / 路线',
      question: '想写什么题材或路线？（可多选）',
      multiSelect: true,
      options: [
        { label: '都市现实' },
        { label: '悬疑推理' },
        { label: '玄幻修仙' },
        { label: '科幻' },
        { label: '言情' },
        { label: '规则怪谈 / 无限流' },
        { label: '纯文学' },
      ],
    },
    {
      id: 'tone',
      header: '文风',
      question: '希望是什么文风？（可多选）',
      multiSelect: true,
      options: [
        { label: '朴素克制' },
        { label: '冷峻' },
        { label: '华丽铺陈' },
        { label: '幽默' },
        { label: '细腻抒情' },
        { label: '荒诞' },
        { label: '热血' },
      ],
    },
    {
      id: 'length',
      header: '篇幅',
      question: '计划写多长？',
      options: [
        { label: '短篇', description: '几万字以内' },
        { label: '中篇', description: '十几万到几十万字' },
        { label: '长篇连载', description: '百万字级、持续更新' },
      ],
    },
    {
      id: 'chapterWords',
      header: '每章字数',
      question: '每章大约多少字？',
      options: [
        { label: '1500', description: '短平快' },
        { label: '2000', description: '常见网文节奏' },
        { label: '2500', description: '默认' },
        { label: '3000', description: '细节更足' },
        { label: '4000', description: '长章、信息量大' },
      ],
    },
    {
      id: 'reviewers',
      header: '审稿子智能体',
      question: '审稿想用哪些子智能体？',
      options: [
        { label: INTAKE_REVIEW_DEFAULT, description: '约 11 个角色，平衡成本' },
        { label: INTAKE_REVIEW_ALL, description: '32 个全开，最全面也最贵' },
        { label: INTAKE_REVIEW_LATER, description: '之后在侧边栏逐个勾选' },
      ],
    },
    {
      id: 'twist',
      header: '跳脱值',
      question: '反套路程度要多高？',
      options: [
        { label: '稳定 20', description: '遵循类型预期' },
        { label: '适度 40', description: '关键节点有意外' },
        { label: '偏反套路 70', description: '主动避开常见桥段' },
        { label: '很高 90', description: '强反套路，会提示甄别' },
      ],
    },
  ]
}

function itemOf(answer, id) {
  const items = Array.isArray(answer?.answers) ? answer.answers : []
  return items.find((item) => item?.id === id)
}

function selectedOf(answer, id) {
  const item = itemOf(answer, id)
  return Array.isArray(item?.selected) ? item.selected.filter((value) => typeof value === 'string') : []
}

function customOf(answer, id) {
  const item = itemOf(answer, id)
  return typeof item?.custom === 'string' ? item.custom.trim() : ''
}

function numberIn(label, fallback) {
  const match = String(label ?? '').match(/\d+/)
  if (match === null) return fallback
  const value = Number.parseInt(match[0], 10)
  return Number.isFinite(value) ? value : fallback
}

/** Parse the intake card answer into project settings. */
export function parseIntakeAnswers(answer) {
  const title = customOf(answer, 'title') || '未命名小说'
  const platform = customOf(answer, 'platform') || selectedOf(answer, 'platform')[0] || '暂不指定'
  const genre = selectedOf(answer, 'genre').join('、') || customOf(answer, 'genre')
  const tone = selectedOf(answer, 'tone').join('、') || customOf(answer, 'tone')
  const length = selectedOf(answer, 'length')[0] || ''
  const chapterWords = numberIn(selectedOf(answer, 'chapterWords')[0] ?? customOf(answer, 'chapterWords'), 2500)
  const reviewerChoice = selectedOf(answer, 'reviewers')[0] || INTAKE_REVIEW_DEFAULT
  const twist = numberIn(selectedOf(answer, 'twist')[0] ?? customOf(answer, 'twist'), 30)
  return {
    title: title.slice(0, 60),
    platform: platform.slice(0, 40),
    genre,
    tone,
    length,
    chapterWords: Math.min(8000, Math.max(800, chapterWords)),
    reviewerChoice,
    twist: Math.min(100, Math.max(0, twist)),
  }
}

/** Answers persisted on the project record. */
export function intakeAnswers(intake) {
  const answers = {}
  if (intake.platform) answers.platform = intake.platform
  if (intake.genre) answers.genre = intake.genre
  if (intake.tone) answers.tone = intake.tone
  if (intake.length) answers.length = intake.length
  answers.chapterWords = String(intake.chapterWords)
  return answers
}
