import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  slugify, novelsRoot, safeJoin, projectPaths, newProject, saveProject, loadProject,
  listProjects, upsertChapter, archiveFile, writeTextAtomic, readText,
} from '../lib/store.js'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ns-store-'))
}

test('slugify is stable and filesystem-safe', () => {
  const slug = slugify('我的第一部小说')
  assert.equal(slug, slugify('我的第一部小说'))
  assert.ok(!/[\\/:*?"<>|]/u.test(slug))
  assert.ok(slug.startsWith('我的第一部小说'))
  assert.ok(slugify('').startsWith('novel'))
})

test('safeJoin refuses traversal', () => {
  const root = tempDir()
  assert.throws(() => safeJoin(root, '..', 'escape'))
  assert.ok(safeJoin(root, 'ok').startsWith(path.resolve(root)))
})

test('project create/save/load/list', () => {
  const cwd = tempDir()
  const paths = projectPaths(cwd, 'novel', slugify('测试书'))
  const project = newProject({ title: '测试书', answers: { A1: ['朴素'] }, chapterWords: 2600, rounds: 2 })
  saveProject(paths, project)
  const loaded = loadProject(paths)
  assert.equal(loaded.title, '测试书')
  assert.equal(loaded.chapterWords, 2600)
  const list = listProjects(cwd, 'novel')
  assert.equal(list.length, 1)
  assert.equal(list[0].title, '测试书')
})

test('upsertChapter keeps order and merges', () => {
  const project = newProject({ title: 'x' })
  upsertChapter(project, { no: 2, status: 'drafted' })
  upsertChapter(project, { no: 1, status: 'outlined' })
  upsertChapter(project, { no: 2, status: 'reviewed' })
  assert.deepEqual(project.chapters.map((item) => item.no), [1, 2])
  assert.equal(project.chapters[1].status, 'reviewed')
})

test('atomic text write and archive', () => {
  const cwd = tempDir()
  const paths = projectPaths(cwd, 'novel', slugify('归档'))
  const project = newProject({ title: '归档' })
  saveProject(paths, project)
  const chapter = path.join(paths.chaptersDir, 'ch001.md')
  writeTextAtomic(chapter, '第一版')
  assert.equal(readText(chapter), '第一版')
  const archived = archiveFile(paths, chapter, 'ch001')
  assert.ok(archived)
  assert.equal(readText(archived), '第一版')
})

test('corrupt project json falls back to undefined', () => {
  const cwd = tempDir()
  const paths = projectPaths(cwd, 'novel', 'bad')
  fs.mkdirSync(paths.dir, { recursive: true })
  fs.writeFileSync(paths.project, '{not json')
  assert.equal(loadProject(paths), undefined)
  assert.ok(novelsRoot(cwd, 'novel').endsWith('novel'))
})
