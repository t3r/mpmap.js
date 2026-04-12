#!/usr/bin/env node
/**
 * Runs the HTTP server and `vite build --watch` together.
 * Use this instead of `npm run dev:client` alone — the watcher does not start Express.
 */
const { execSync, spawn } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')
const vitePkgDir = path.dirname(require.resolve('vite/package.json', { paths: [root] }))
const viteCli = path.join(vitePkgDir, 'bin', 'vite.js')

const env = Object.assign({}, process.env, {
  node_env: process.env.node_env || process.env.NODE_ENV || 'development',
  NODE_ENV: process.env.NODE_ENV || process.env.node_env || 'development',
})

try {
  execSync('npx tsc', { cwd: root, stdio: 'inherit', env })
} catch {
  process.exit(1)
}

const tscWatch = spawn('npx', ['tsc', '-w', '--preserveWatchOutput'], {
  stdio: 'inherit',
  cwd: root,
  env,
})

const server = spawn(process.execPath, ['--watch', path.join(root, 'dist', 'server.js')], {
  stdio: 'inherit',
  cwd: root,
  env: env,
})

const vite = spawn(process.execPath, [viteCli, 'build', '--watch'], {
  stdio: 'inherit',
  cwd: root,
  env: env,
})

function shutdown(code) {
  try {
    tscWatch.kill('SIGTERM')
  } catch (e) {}
  try {
    server.kill('SIGTERM')
  } catch (e) {}
  try {
    vite.kill('SIGTERM')
  } catch (e) {}
  process.exit(typeof code === 'number' ? code : 0)
}

process.on('SIGINT', function () {
  shutdown(0)
})
process.on('SIGTERM', function () {
  shutdown(0)
})

server.on('exit', function (code) {
  try {
    tscWatch.kill('SIGTERM')
  } catch (e) {}
  try {
    vite.kill('SIGTERM')
  } catch (e) {}
  process.exit(code == null ? 0 : code)
})

vite.on('exit', function (code) {
  try {
    tscWatch.kill('SIGTERM')
  } catch (e) {}
  try {
    server.kill('SIGTERM')
  } catch (e) {}
  process.exit(code == null ? 0 : code)
})
