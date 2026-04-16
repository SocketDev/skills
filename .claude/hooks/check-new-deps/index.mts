#!/usr/bin/env node
// Claude Code PreToolUse hook — Socket.dev dependency firewall.
//
// Intercepts Edit/Write tool calls to dependency manifest files.
// Extracts newly-added dependencies, builds Package URLs (PURLs),
// and checks them against the Socket.dev malware API.
//
// Diff-aware: when old_string is present (Edit), only deps that
// appear in new_string but NOT in old_string are checked.
//
// Caching: API responses are cached in-process with a TTL to avoid
// redundant network calls when the same dep is checked repeatedly.
//
// Exit codes:
//   0 = allow (no new deps, all clean, or non-dep file)
//   2 = block (malware detected by Socket.dev)

import {
  parseNpmSpecifier,
  stringify,
} from '@socketregistry/packageurl-js'
import type { PackageURL } from '@socketregistry/packageurl-js'
import {
  SOCKET_PUBLIC_API_TOKEN,
} from '@socketsecurity/lib/constants/socket'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import {
  normalizePath,
} from '@socketsecurity/lib/paths/normalize'
import { SocketSdk } from '@socketsecurity/sdk'
import type { MalwareCheckPackage } from '@socketsecurity/sdk'

const logger = getDefaultLogger()

// Per-request timeout (ms) to avoid blocking the hook on slow responses.
const API_TIMEOUT = 5_000
// Max PURLs per batch request (API limit is 1024).
const MAX_BATCH_SIZE = 1024
// How long (ms) to cache a successful API response (5 minutes).
const CACHE_TTL = 5 * 60 * 1_000
// Maximum cache entries before forced eviction of oldest.
const MAX_CACHE_SIZE = 500

// SDK instance using the public API token (no user config needed).
const sdk = new SocketSdk(SOCKET_PUBLIC_API_TOKEN, {
  timeout: API_TIMEOUT,
})

// --- types ---

// Extracted dependency with ecosystem type, name, and optional scope.
interface Dep {
  type: string
  name: string
  namespace?: string
  version?: string
}

// Shape of the JSON blob Claude Code pipes to the hook via stdin.
interface HookInput {
  tool_name: string
  tool_input?: {
    file_path?: string
    new_string?: string
    old_string?: string
    content?: string
  }
}

// Result of checking a single dep against the Socket.dev API.
interface CheckResult {
  purl: string
  blocked?: boolean
  reason?: string
}


// A cached API lookup result with expiration timestamp.
interface CacheEntry {
  result: CheckResult | undefined
  expiresAt: number
}

// Function that extracts deps from file content.
type Extractor = (content: string) => Dep[]

// --- cache ---

const cache = new Map<string, CacheEntry>()

function cacheGet(key: string): CacheEntry | undefined {
  const entry = cache.get(key)
  if (!entry) return
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return
  }
  return entry
}

function cacheSet(
  key: string,
  result: CheckResult | undefined,
): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now()
    for (const { 0: k, 1: v } of cache) {
      if (now > v.expiresAt) cache.delete(k)
    }
  }
  if (cache.size >= MAX_CACHE_SIZE) {
    const excess = cache.size - MAX_CACHE_SIZE + 1
    let dropped = 0
    for (const k of cache.keys()) {
      if (dropped >= excess) break
      cache.delete(k)
      dropped++
    }
  }
  cache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL,
  })
}

// Manifest file suffix → extractor function.
// __proto__: null prevents prototype-pollution on lookups.
const extractors: Record<string, Extractor> = {
  __proto__: null as unknown as Extractor,
  // npm
  'package.json': extractNpm,
  'package-lock.json': extractNpmLockfile,
  'pnpm-lock.yaml': extractNpmLockfile,
  'yarn.lock': extractNpmLockfile,
  // pypi
  'requirements.txt': extractPypi,
  'pyproject.toml': extractPypi,
  'setup.py': extractPypi,
  'Pipfile.lock': extractPipfileLock,
  'poetry.lock': extract(
    /name\s*=\s*"([a-zA-Z][\w.-]*)"/gm,
    (m): Dep => ({ type: 'pypi', name: m[1] })
  ),
  // cargo
  'Cargo.toml': extractCargoToml,
  'Cargo.lock': extract(
    /name\s*=\s*"([\w][\w-]*)"/gm,
    (m): Dep => ({ type: 'cargo', name: m[1] })
  ),
  // go
  'go.mod': extractGo,
  'go.sum': extractGo,
  // maven
  'pom.xml': extractMaven,
  'build.gradle': extractMaven,
  'build.gradle.kts': extractMaven,
  // ruby
  'Gemfile': extract(
    /gem\s+['"]([^'"]+)['"]/g,
    (m): Dep => ({ type: 'gem', name: m[1] })
  ),
  'Gemfile.lock': extract(
    /^\s{4}(\w[\w-]*)\s+\(/gm,
    (m): Dep => ({ type: 'gem', name: m[1] })
  ),
  // nuget
  '.csproj': extract(
    /PackageReference\s+Include="([^"]+)"/g,
    (m): Dep => ({ type: 'nuget', name: m[1] })
  ),
  // composer
  'composer.json': extract(
    /"([a-z][\w-]*)\/([a-z][\w-]*)":\s*"/g,
    (m): Dep => ({
      type: 'composer',
      namespace: m[1],
      name: m[2],
    })
  ),
  'composer.lock': extract(
    /"name":\s*"([a-z][\w-]*)\/([a-z][\w-]*)"/g,
    (m): Dep => ({
      type: 'composer',
      namespace: m[1],
      name: m[2],
    })
  ),
}

// --- main (only when executed directly, not imported) ---

if (import.meta.filename === process.argv[1]) {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const hook: HookInput = JSON.parse(input)

  if (hook.tool_name !== 'Edit' && hook.tool_name !== 'Write') {
    process.exitCode = 0
  } else {
    process.exitCode = await check(hook)
  }
}

// --- core ---

async function check(hook: HookInput): Promise<number> {
  const filePath = normalizePath(
    hook.tool_input?.file_path || ''
  )

  const extractor = findExtractor(filePath)
  if (!extractor) return 0

  const newContent =
    hook.tool_input?.new_string
    ?? hook.tool_input?.content
    ?? ''
  const oldContent = hook.tool_input?.old_string ?? ''

  const newDeps = extractor(newContent)
  if (newDeps.length === 0) return 0

  const deps = oldContent
    ? diffDeps(newDeps, extractor(oldContent))
    : newDeps
  if (deps.length === 0) return 0

  const blocked = await checkDepsBatch(deps)

  if (blocked.length > 0) {
    logger.error(`Socket: blocked ${blocked.length} dep(s):`)
    for (const b of blocked) {
      logger.error(`  ${b.purl}: ${b.reason}`)
    }
    return 2
  }
  return 0
}

async function checkDepsBatch(
  deps: Dep[],
): Promise<CheckResult[]> {
  const blocked: CheckResult[] = []

  const uncached: Array<{ dep: Dep; purl: string }> = []
  for (const dep of deps) {
    const purl = stringify(dep as unknown as PackageURL)
    const cached = cacheGet(purl)
    if (cached) {
      if (cached.result?.blocked) blocked.push(cached.result)
      continue
    }
    uncached.push({ dep, purl })
  }

  if (!uncached.length) return blocked

  try {
    for (let i = 0; i < uncached.length; i += MAX_BATCH_SIZE) {
      const batch = uncached.slice(i, i + MAX_BATCH_SIZE)
      const components = batch.map(({ purl }) => ({ purl }))

      const result = await sdk.checkMalware(components)

      if (!result.success) {
        logger.warn(
          `Socket: API returned ${result.status}, allowing all`
        )
        return blocked
      }

      const purlByKey = new Map<string, string>()
      for (const { dep, purl } of batch) {
        const ns = dep.namespace ? `${dep.namespace}/` : ''
        purlByKey.set(`${dep.type}:${ns}${dep.name}`, purl)
      }

      for (const pkg of result.data as MalwareCheckPackage[]) {
        const ns = pkg.namespace ? `${pkg.namespace}/` : ''
        const key = `${pkg.type}:${ns}${pkg.name}`
        const purl = purlByKey.get(key)
        if (!purl) continue

        const malware = pkg.alerts.find(
          a => a.severity === 'critical' || a.type === 'malware'
        )
        if (malware) {
          const cr: CheckResult = {
            purl,
            blocked: true,
            reason: `${malware.type} — ${malware.severity ?? 'critical'}`,
          }
          cacheSet(purl, cr)
          blocked.push(cr)
          continue
        }

        cacheSet(purl, undefined)
      }
    }
  } catch (e) {
    logger.warn(
      `Socket: network error`
      + ` (${(e as Error).message}), allowing all`
    )
  }

  return blocked
}

function diffDeps(newDeps: Dep[], oldDeps: Dep[]): Dep[] {
  const old = new Set(
    oldDeps.map(d => stringify(d as unknown as PackageURL))
  )
  return newDeps.filter(
    d => !old.has(stringify(d as unknown as PackageURL))
  )
}

function findExtractor(
  filePath: string,
): Extractor | undefined {
  for (const { 0: suffix, 1: fn } of Object.entries(extractors)) {
    if (filePath.endsWith(suffix)) return fn
  }
}

// --- extractor factory ---

function extract(
  re: RegExp,
  transform: (m: RegExpExecArray) => Dep | undefined,
): Extractor {
  return (content: string): Dep[] => {
    const deps: Dep[] = []
    for (const m of content.matchAll(re)) {
      const dep = transform(m as RegExpExecArray)
      if (dep) deps.push(dep)
    }
    return deps
  }
}

// --- ecosystem extractors ---

function extractCargoToml(content: string): Dep[] {
  const deps: Dep[] = []
  const depSectionRe = /^\[(?:(?:dev-|build-)?dependencies(?:\.[^\]]+)?)\]\s*$/gm
  const anySectionRe = /^\[/gm
  let sectionMatch
  while ((sectionMatch = depSectionRe.exec(content)) !== null) {
    const sectionStart = sectionMatch.index + sectionMatch[0].length
    anySectionRe.lastIndex = sectionStart
    const nextSection = anySectionRe.exec(content)
    const sectionEnd = nextSection ? nextSection.index : content.length
    const sectionText = content.slice(sectionStart, sectionEnd)
    const lineRe = /^(\w[\w-]*)\s*=\s*(?:\{[^}]*version\s*=\s*"[^"]*"|\s*"[^"]*")/gm
    let m
    while ((m = lineRe.exec(sectionText)) !== null) {
      deps.push({ type: 'cargo', name: m[1] })
    }
  }
  return deps
}

function extractGo(content: string): Dep[] {
  const deps: Dep[] = []
  for (const m of content.matchAll(
    /([\w./-]+)\s+v[\d.]+/gm
  )) {
    const parts = m[1].split('/')
    deps.push({
      type: 'golang',
      name: parts.pop()!,
      namespace: parts.join('/') || undefined,
    })
  }
  return deps
}

function extractMaven(content: string): Dep[] {
  const deps: Dep[] = []
  for (const m of content.matchAll(
    /<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>/g
  )) {
    deps.push({
      type: 'maven',
      namespace: m[1],
      name: m[2],
    })
  }
  for (const m of content.matchAll(
    /(?:implementation|api|compile)\s+['"]([^:'"]+):([^:'"]+)(?::[^'"]*)?['"]/g
  )) {
    deps.push({
      type: 'maven',
      namespace: m[1],
      name: m[2],
    })
  }
  return deps
}

// Convenience entry point for testing.
function extractNewDeps(
  rawFilePath: string,
  content: string,
): Dep[] {
  const filePath = normalizePath(rawFilePath)
  const extractor = findExtractor(filePath)
  return extractor ? extractor(content) : []
}

function extractNpmLockfile(content: string): Dep[] {
  const deps: Dep[] = []
  const seen = new Set<string>()

  for (const m of content.matchAll(
    /node_modules\/((?:@[\w.-]+\/)?[\w][\w.-]*)/g
  )) {
    addNpmDep(m[1], deps, seen)
  }
  for (const m of content.matchAll(
    /['"/]((?:@[\w.-]+\/)?[\w][\w.-]*)@/gm
  )) {
    addNpmDep(m[1], deps, seen)
  }
  return deps
}

function addNpmDep(
  raw: string,
  deps: Dep[],
  seen: Set<string>,
): void {
  if (seen.has(raw)) return
  seen.add(raw)
  if (raw.startsWith('.') || raw.startsWith('/')) return
  if (raw.startsWith('@') || /^[a-z]/.test(raw)) {
    const { namespace, name } = parseNpmSpecifier(raw)
    if (name) deps.push({ type: 'npm', namespace, name })
  }
}

function extractNpm(content: string): Dep[] {
  const deps: Dep[] = []
  for (const m of content.matchAll(
    /"(@?[^"]+)":\s*"([^"]*)"/g
  )) {
    const raw = m[1]
    const val = m[2]
    if (
      raw.startsWith('node:')
      || raw.startsWith('.')
      || raw.startsWith('/')
    ) continue
    if (!/^[\^~><=*]|^\d|^workspace:|^catalog:|^npm:|^latest$/.test(val)) continue
    if (PACKAGE_JSON_METADATA_KEYS.has(raw)) continue
    if (raw.startsWith('@') || /^[a-z]/.test(raw)) {
      const { namespace, name } = parseNpmSpecifier(raw)
      if (name) deps.push({ type: 'npm', namespace, name })
    }
  }
  return deps
}

const PACKAGE_JSON_METADATA_KEYS = new Set([
  'name', 'version', 'description', 'main', 'module', 'browser', 'types',
  'typings', 'license', 'homepage', 'repository', 'bugs', 'author',
  'type', 'engines', 'os', 'cpu', 'publishConfig', 'access',
  'sideEffects', 'unpkg', 'jsdelivr', 'exports',
])

function extractPipfileLock(content: string): Dep[] {
  const deps: Dep[] = []
  try {
    const lock = JSON.parse(content) as Record<string, Record<string, unknown>>
    for (const section of ['default', 'develop']) {
      const packages = lock[section]
      if (packages && typeof packages === 'object') {
        for (const name of Object.keys(packages)) {
          deps.push({ type: 'pypi', name })
        }
      }
    }
  } catch {
    for (const m of content.matchAll(/"([a-zA-Z][\w.-]*)"\s*:\s*\{/g)) {
      deps.push({ type: 'pypi', name: m[1] })
    }
  }
  return deps
}

function extractPypi(content: string): Dep[] {
  const deps: Dep[] = []
  const seen = new Set<string>()
  for (const m of content.matchAll(
    /^([a-zA-Z][\w.-]+)\s*(?:[>=<!~\[;]|$)/gm
  )) {
    const name = m[1].toLowerCase()
    if (!seen.has(name)) {
      seen.add(name)
      deps.push({ type: 'pypi', name: m[1] })
    }
  }
  for (const m of content.matchAll(
    /["']([a-zA-Z][\w.-]+)\s*[>=<!~\[]/g
  )) {
    const name = m[1].toLowerCase()
    if (!seen.has(name)) {
      seen.add(name)
      deps.push({ type: 'pypi', name: m[1] })
    }
  }
  return deps
}

export {
  cache,
  cacheGet,
  cacheSet,
  checkDepsBatch,
  diffDeps,
  extractMaven,
  extractNewDeps,
  extractNpm,
  extractNpmLockfile,
  extractPypi,
  findExtractor,
}
