import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPlatformQuestions, buildThemeQuestions, buildPreferenceQuestions,
  parseIntakeAnswers, intakeAnswers, platformProfile,
  INTAKE_REVIEW_ALL, INTAKE_REVIEW_DEFAULT,
} from '../lib/intake.js'

test('stage one asks title and platform first', () => {
  const questions = buildPlatformQuestions()
  assert.deepEqual(questions.map((item) => item.id), ['title', 'platform'])
  const platform = questions.find((item) => item.id === 'platform')
  assert.ok(platform.options.some((option) => option.label === '番茄'))
})

test('genre and tone options follow the platform profile', () => {
  const questions = buildThemeQuestions('番茄')
  const genre = questions.find((item) => item.id === 'genre')
  const tone = questions.find((item) => item.id === 'tone')
  assert.equal(genre.options[0].label, '都市现实')
  assert.equal(genre.options[0].description, '平台推荐')
  assert.equal(tone.options[0].label, '冷峻')
  assert.equal(tone.options[0].description, '平台推荐')
})

test('preference options prefill from the platform', () => {
  const questions = buildPreferenceQuestions('番茄')
  const length = questions.find((item) => item.id === 'length')
  const words = questions.find((item) => item.id === 'chapterWords')
  const twist = questions.find((item) => item.id === 'twist')
  assert.equal(length.options[0].label, '长篇连载')
  assert.equal(length.options[0].description, '平台推荐')
  assert.equal(words.options[0].label, '2000')
  assert.equal(words.options[0].description, '平台推荐')
  assert.equal(twist.options[0].label, '适度 40')
  assert.equal(twist.options[0].description, '平台推荐')
})

test('pure literature drops commercial reviewers', () => {
  const questions = buildPreferenceQuestions('纯文学')
  const reviewers = questions.find((item) => item.id === 'reviewers')
  const recommended = reviewers.options.find((option) => option.label === INTAKE_REVIEW_DEFAULT)
  assert.ok(recommended.description.includes('剔除'))
})

test('profile defaults vary by platform', () => {
  assert.equal(platformProfile('晋江').chapterWords, 2500)
  assert.equal(platformProfile('知乎盐选').length, '短篇')
  assert.equal(platformProfile('知乎盐选').twist, 60)
  assert.equal(platformProfile('不存在').length, '长篇连载')
})

test('missing stages fall back to platform defaults', () => {
  const intake = parseIntakeAnswers({
    answers: [
      { id: 'title', selected: [], custom: '夜行记' },
      { id: 'platform', selected: ['番茄'] },
    ],
  })
  assert.equal(intake.title, '夜行记')
  assert.equal(intake.platform, '番茄')
  assert.equal(intake.length, '长篇连载')
  assert.equal(intake.chapterWords, 2000)
  assert.equal(intake.twist, 40)
  assert.equal(intake.reviewerChoice, INTAKE_REVIEW_DEFAULT)
})

test('merged answers from three stages win over the profile', () => {
  const intake = parseIntakeAnswers({
    answers: [
      { id: 'platform', selected: ['晋江'] },
      { id: 'genre', selected: ['言情', '科幻'] },
      { id: 'tone', selected: ['细腻抒情'] },
      { id: 'length', selected: ['中篇'] },
      { id: 'chapterWords', selected: ['3000'] },
      { id: 'reviewers', selected: [INTAKE_REVIEW_ALL] },
      { id: 'twist', selected: ['偏反套路 70'] },
    ],
  })
  assert.equal(intake.platform, '晋江')
  assert.equal(intake.genre, '言情、科幻')
  assert.equal(intake.tone, '细腻抒情')
  assert.equal(intake.length, '中篇')
  assert.equal(intake.chapterWords, 3000)
  assert.equal(intake.reviewerChoice, INTAKE_REVIEW_ALL)
  assert.equal(intake.twist, 70)
})

test('custom values and clamps', () => {
  const intake = parseIntakeAnswers({
    answers: [
      { id: 'platform', selected: [], custom: '豆瓣阅读' },
      { id: 'chapterWords', selected: [], custom: '99999' },
      { id: 'twist', selected: [], custom: '120' },
    ],
  })
  assert.equal(intake.platform, '豆瓣阅读')
  assert.equal(intake.chapterWords, 8000)
  assert.equal(intake.twist, 100)
})

test('intake answers become project fields', () => {
  const answers = intakeAnswers({ platform: '晋江', genre: '言情', tone: '细腻抒情', length: '中篇', chapterWords: 2500 })
  assert.equal(answers.platform, '晋江')
  assert.equal(answers.genre, '言情')
  assert.equal(answers.chapterWords, '2500')
})

test('re-enabling an existing project only asks the platform', () => {
  const questions = buildPlatformQuestions({ includeTitle: false })
  assert.deepEqual(questions.map((item) => item.id), ['platform'])
})

test('preference stage carries no preset genre or tone', () => {
  const ids = buildPreferenceQuestions('番茄').map((item) => item.id)
  assert.deepEqual(ids, ['length', 'chapterWords', 'reviewers', 'twist'])
})
