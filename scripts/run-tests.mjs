import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const result = spawnSync(process.execPath, ['--test', path.join(root, 'test')], {
  stdio: 'inherit',
  cwd: root,
})
process.exit(result.status ?? 1)
