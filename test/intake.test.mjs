import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIntakeQuestions, parseIntakeAnswers, intakeAnswers,
  INTAKE_REVIEW_ALL, INTAKE_REVIEW_DEFAULT,
} from '../lib/intake.js'

test('intake asks every mandatory dimension', () => {
  const questions = buildIntakeQuestions()
  const ids = questions.map((item) => item.id)
  for (const id of ['title', 'platform', 'genre', 'tone', 'length', 'chapterWords', 'reviewers', 'twist']) {
    assert.ok(ids.includes(id), `missing intake question ${id}`)
  }
  const platform = questions.find((item) => item.id === 'platform')
  assert.ok(platform.options.some((option) => option.label === '番茄'))
  const reviewers = questions.find((item) => item.id === 'reviewers')
  assert.ok(reviewers.options.some((option) => option.label === INTAKE_REVIEW_ALL))
})

test('parses a complete answer', () => {
  const intake = parseIntakeAnswers({
    answers: [
      { id: 'title', selected: [], custom: '夜行记' },
      { id: 'platform', selected: ['番茄'] },
      { id: 'genre', selected: ['悬疑推理', '规则怪谈 / 无限流'] },
      { id: 'tone', selected: ['冷峻', '华丽铺陈'] },
      { id: 'length', selected: ['长篇连载'] },
      { id: 'chapterWords', selected: ['3000'] },
      { id: 'reviewers', selected: [INTAKE_REVIEW_ALL] },
      { id: 'twist', selected: ['偏反套路 70'] },
    ],
  })
  assert.equal(intake.title, '夜行记')
  assert.equal(intake.platform, '番茄')
  assert.equal(intake.genre, '悬疑推理、规则怪谈 / 无限流')
  assert.equal(intake.tone, '冷峻、华丽铺陈')
  assert.equal(intake.length, '长篇连载')
  assert.equal(intake.chapterWords, 3000)
  assert.equal(intake.reviewerChoice, INTAKE_REVIEW_ALL)
  assert.equal(intake.twist, 70)
})

test('falls back to safe defaults', () => {
  const intake = parseIntakeAnswers({ answers: [] })
  assert.equal(intake.title, '未命名小说')
  assert.equal(intake.platform, '暂不指定')
  assert.equal(intake.chapterWords, 2500)
  assert.equal(intake.reviewerChoice, INTAKE_REVIEW_DEFAULT)
  assert.equal(intake.twist, 30)
})

test('custom platform and clamped numbers', () => {
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
  const answers = intakeAnswers({
    platform: '晋江', genre: '言情', tone: '细腻抒情', length: '中篇', chapterWords: 2500,
  })
  assert.equal(answers.platform, '晋江')
  assert.equal(answers.genre, '言情')
  assert.equal(answers.chapterWords, '2500')
})
