const { spawn } = require('node:child_process')
const children = [
  spawn(
    'pnpm',
    ['exec', 'tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'],
    { stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    ['--env-file-if-exists=.env', '--watch', 'dist/main.js'],
    { stdio: 'inherit' },
  ),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop())
for (const child of children) child.on('exit', (code) => stop(code ?? 1))
