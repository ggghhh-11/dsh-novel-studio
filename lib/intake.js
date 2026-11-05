/**
 * First-run intake, split into stages.
 *
 * Stage 1 asks title + platform. The platform then drives the recommended
 * options for every later stage (genre, tone, length, words, reviewers,
 * twist), so the user confirms suggestions instead of filling a blank form.
 */

export const INTAKE_REVIEW_DEFAULT = '默认子集（11 个，推荐）'
export const INTAKE_REVIEW_ALL = '全开 32 个'
export const INTAKE_REVIEW_LATER = '稍后在侧边栏自选'

const ALL_GENRES = ['都市现实', '悬疑推理', '玄幻修仙', '科幻', '言情', '规则怪谈 / 无限流', '纯文学']
const ALL_TONES = ['朴素克制', '冷峻', '华丽铺陈', '幽默', '细腻抒情', '荒诞', '热血']

/** Per-platform defaults; the intake questions order and preselect these. */
export const PLATFORM_PROFILES = {
  番茄: {
    genres: ['都市现实', '悬疑推理', '玄幻修仙', '规则怪谈 / 无限流', '言情'],
    tones: ['冷峻', '热血', '幽默', '华丽铺陈'],
    length: '长篇连载',
    chapterWords: 2000,
    twist: 40,
    note: '免费阅读、强节奏、章末钩子；短章高频更新更吃香',
  },
  起点: {
    genres: ['玄幻修仙', '科幻', '悬疑推理', '都市现实'],
    tones: ['热血', '冷峻', '华丽铺陈'],
    length: '长篇连载',
    chapterWords: 3000,
    twist: 40,
    note: '付费订阅、长线升级；设定与力量体系要稳',
  },
  晋江: {
    genres: ['言情', '纯文学', '科幻'],
    tones: ['细腻抒情', '冷峻', '华丽铺陈'],
    length: '长篇连载',
    chapterWords: 2500,
    twist: 30,
    note: '人物与情感驱动，读者对文笔和关系线敏感',
  },
  知乎盐选: {
    genres: ['悬疑推理', '都市现实', '科幻'],
    tones: ['冷峻', '幽默', '荒诞'],
    length: '短篇',
    chapterWords: 2000,
    twist: 60,
    note: '开篇即钩子、短篇强反转；前三段决定去留',
  },
  纯文学: {
    genres: ['纯文学', '都市现实'],
    tones: ['朴素克制', '细腻抒情', '荒诞'],
    length: '中篇',
    chapterWords: 3500,
    twist: 30,
    note: '语言与结构优先；商业运营类角色会自动剔除',
  },
  暂不指定: {
    genres: ALL_GENRES,
    tones: ALL_TONES,
    length: '长篇连载',
    chapterWords: 2500,
    twist: 30,
    note: '先按通用路线，确定平台后可以再调整',
  },
}

export function platformProfile(platform) {
  return PLATFORM_PROFILES[platform] ?? PLATFORM_PROFILES['暂不指定']
}

function withRecommended(all, recommended) {
  const head = []
  const tail = []
  const recommendedSet = new Set(recommended)
  for (const label of all) {
    if (recommendedSet.has(label)) head.push({ label, description: '平台推荐' })
    else tail.push({ label })
  }
  return [...head, ...tail]
}

/** Stage 1: title (new project only) and publishing platform. */
export function buildPlatformQuestions({ includeTitle = true } = {}) {
  const questions = []
  if (includeTitle) {
    questions.push({
      id: 'title',
      header: '书名',
      question: '这本书叫什么？（可留空，之后再改）',
      options: [{ label: '暂不命名', description: '先用"未命名小说"占位' }],
    })
  }
  questions.push({
    id: 'platform',
    header: '发表平台',
    question: '先确定发表平台；确定后我会自动检索该平台当前的热门与潜力方向，再让你确认题材和文风。',
    options: [
      { label: '番茄', description: '免费阅读、强节奏' },
      { label: '起点', description: '付费订阅、男频为主' },
      { label: '晋江', description: '女性向、情感与人物' },
      { label: '知乎盐选', description: '短篇、强钩子' },
      { label: '纯文学', description: '期刊/出版向' },
      { label: '暂不指定', description: '先按通用路线写' },
    ],
  })
  return questions
}

/** Stage 2: genre and tone, ordered by the platform's recommendations. */
export function buildThemeQuestions(platform) {
  const profile = platformProfile(platform)
  return [
    {
      id: 'genre',
      header: '题材 / 路线',
      question: `${platform}更吃这些题材（推荐项已排在前面，可多选）`,
      multiSelect: true,
      options: withRecommended(ALL_GENRES, profile.genres),
    },
    {
      id: 'tone',
      header: '文风',
      question: '希望是什么文风？（推荐项已排在前面，可多选）',
      multiSelect: true,
      options: withRecommended(ALL_TONES, profile.tones),
    },
  ]
}

/** Stage 3: length, words, reviewer bench and twist, prefilled from the platform. */
export function buildPreferenceQuestions(platform) {
  const profile = platformProfile(platform)
  const lengthOptions = [
    { label: '短篇', description: '几万字以内' },
    { label: '中篇', description: '十几万到几十万字' },
    { label: '长篇连载', description: '百万字级、持续更新' },
  ]
  const recommendedLength = lengthOptions.find((option) => option.label === profile.length)
  const otherLengths = lengthOptions.filter((option) => option.label !== profile.length)
  const wordOptions = [1500, 2000, 2500, 3000, 4000]
  const recommendedWord = wordOptions.includes(profile.chapterWords) ? profile.chapterWords : 2500
  const orderedWords = [
    { label: String(recommendedWord), description: '平台推荐' },
    ...wordOptions.filter((value) => value !== recommendedWord).map((value) => ({ label: String(value) })),
  ]
  const twistOptions = [
    { label: '稳定 20', description: '遵循类型预期' },
    { label: '适度 40', description: '关键节点有意外' },
    { label: '偏反套路 70', description: '主动避开常见桥段' },
    { label: '很高 90', description: '强反套路，会提示甄别' },
  ]
  const recommendedTwist = twistOptions.reduce((best, option) => {
    const value = Number.parseInt(option.label.match(/\d+/)?.[0] ?? '0', 10)
    const bestValue = Number.parseInt(best.label.match(/\d+/)?.[0] ?? '0', 10)
    return Math.abs(value - profile.twist) < Math.abs(bestValue - profile.twist) ? option : best
  })
  return [
    {
      id: 'length',
      header: '篇幅',
      question: `计划写多长？（${platform}常见：${profile.length}）`,
      options: [
        { ...(recommendedLength ?? lengthOptions[0]), description: '平台推荐' },
        ...otherLengths,
      ],
    },
    {
      id: 'chapterWords',
      header: '每章字数',
      question: `每章大约多少字？（${platform}常见：${profile.chapterWords}）`,
      options: orderedWords,
    },
    {
      id: 'reviewers',
      header: '审稿子智能体',
      question: `审稿想用哪些子智能体？（共 32 个：默认子集按目标取 7–11 个，全开 32 个）`,
      options: [
        { label: INTAKE_REVIEW_DEFAULT, description: platform === '纯文学' ? '已自动剔除商业运营类角色' : '按目标选 7–11 个角色，平衡成本' },
        { label: INTAKE_REVIEW_ALL, description: '32 个全开，最全面也最贵' },
        { label: INTAKE_REVIEW_LATER, description: '之后在侧边栏逐个勾选' },
      ],
    },
    {
      id: 'twist',
      header: '跳脱值',
      question: `反套路程度要多高？（${platform}建议：${profile.twist}）`,
      options: [
        { ...recommendedTwist, description: '平台推荐' },
        ...twistOptions.filter((option) => option.label !== recommendedTwist.label),
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

/** Parse merged answers from all intake stages; missing values fall back to the platform profile. */
export function parseIntakeAnswers(answer) {
  const title = customOf(answer, 'title') || '未命名小说'
  const platform = customOf(answer, 'platform') || selectedOf(answer, 'platform')[0] || '暂不指定'
  const profile = platformProfile(platform)
  const genre = selectedOf(answer, 'genre').join('、') || customOf(answer, 'genre')
  const tone = selectedOf(answer, 'tone').join('、') || customOf(answer, 'tone')
  const length = selectedOf(answer, 'length')[0] || profile.length
  const chapterWords = numberIn(selectedOf(answer, 'chapterWords')[0] ?? customOf(answer, 'chapterWords'), profile.chapterWords)
  const reviewerChoice = selectedOf(answer, 'reviewers')[0] || INTAKE_REVIEW_DEFAULT
  const twist = numberIn(selectedOf(answer, 'twist')[0] ?? customOf(answer, 'twist'), profile.twist)
  return {
    title: title.slice(0, 60),
    platform: platform.slice(0, 40),
    genre,
    tone,
    length,
    chapterWords: Math.min(8000, Math.max(800, chapterWords)),
    reviewerChoice,
    twist: Math.min(100, Math.max(0, twist)),
    profile,
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
