import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'
import type { AgentType } from '../../shared/native-chat-types'
import { walkSessionFiles } from '../ai-vault/session-scanner-discovery'
import { getOrcaManagedCodexHomePath } from '../codex/codex-home-paths'
import { normalizeRuntimePathForComparison } from '../../shared/cross-platform-path'

// Why: these mirror the path constants in ai-vault/session-scanner.ts. Reads
// run in the main process against the runtime's own home directory; over SSH
// the remote main resolves its local home, so we never hardcode an absolute
// user path — homedir()/CODEX_HOME resolution stays runtime-relative and is
// computed per call (not at module load) so it tracks the live home.
function claudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects')
}

// [FORK] cursor-agent хранит транскрипты в
// ~/.cursor/projects/<slug>/agent-transcripts/<id>/<id>.jsonl,
// slug — путь cwd без ведущего разделителя, [/.] → '-'.
function cursorProjectsDir(): string {
  return join(homedir(), '.cursor', 'projects')
}

export function cursorProjectSlug(cwd: string): string {
  return cwd.replace(/^[/\\]+/, '').replace(/[/\\.]/g, '-')
}

// Why: Orca launches Codex with ORCA_CODEX_HOME pointing at its own managed
// runtime home, so Orca-started Codex rollout files land under
// `<managed home>/sessions`, NOT `~/.codex/sessions`. Search the managed home
// first (that's where this main process's Codex sessions actually live), then
// fall back to CODEX_HOME/~/.codex so a non-Orca Codex transcript still resolves.
// Duplicates are filtered so a managed-home symlink to ~/.codex isn't scanned twice.
function codexSessionsDirs(): string[] {
  const candidates = [
    join(getOrcaManagedCodexHomePath(), 'sessions'),
    join(process.env.CODEX_HOME?.trim() || join(homedir(), '.codex'), 'sessions')
  ]
  return candidates.filter((dir, index) => candidates.indexOf(dir) === index)
}

export type ResolveSessionFileOptions = {
  /** Override the Claude projects root (used by tests / isolated scans). */
  claudeProjectsDir?: string
  /** Override the Codex sessions roots, searched in order (tests / isolated
   *  scans). Defaults to the orca-managed home then CODEX_HOME/~/.codex. */
  codexSessionsDirs?: string[]
  /** [FORK] Override the cursor-agent projects root (tests / isolated scans). */
  cursorProjectsDir?: string
  /** Authoritative transcript path reported by the agent hook
   *  (`providerSession.transcriptPath`). When set and the file exists, it is used
   *  directly — recent Claude Code names the transcript with a UUID that differs
   *  from the hook session_id, so the id-based glob below would miss it. */
  transcriptPath?: string
}

/**
 * Resolve the on-disk JSONL transcript path for a given agent + session id.
 *
 * Prefers the hook-reported `transcriptPath` when it exists on disk (authoritative).
 * Otherwise: Claude nests transcripts by project slug
 * (`~/.claude/projects/<slug>/<id>.jsonl`), so we glob the projects subdirs for
 * `<id>.jsonl`. Codex stores rollout files under date-nested dirs whose file name
 * embeds the session id, so we match by the session id appearing in the file name.
 * Returns null when no matching transcript exists.
 */
export async function resolveSessionFilePath(
  agent: AgentType,
  sessionId: string,
  options: ResolveSessionFileOptions = {}
): Promise<string | null> {
  // Why: the hook's transcript_path is the exact file the agent is writing, so it
  // beats reconstructing a path from the session id. Guard with existsSync so a
  // stale/remote path falls through to the id-based search rather than returning
  // a non-existent file.
  const hookPath = options.transcriptPath?.trim()
  if (hookPath && extname(hookPath) === '.jsonl' && existsSync(hookPath)) {
    return hookPath
  }

  const trimmedId = sessionId.trim()
  if (!trimmedId) {
    return null
  }

  if (agent === 'claude') {
    return resolveClaudeSessionFile(trimmedId, options.claudeProjectsDir ?? claudeProjectsDir())
  }
  if (agent === 'codex') {
    return resolveCodexSessionFile(trimmedId, options.codexSessionsDirs ?? codexSessionsDirs())
  }
  // [FORK] cursor-agent: <projects>/<slug>/agent-transcripts/<id>/<id>.jsonl.
  if (agent === 'cursor') {
    const targetName = `${trimmedId}.jsonl`
    const files = await walkSessionFiles(
      options.cursorProjectsDir ?? cursorProjectsDir(),
      'cursor',
      [],
      {
        extensions: new Set(['.jsonl']),
        filePredicate: (path) => basename(path) === targetName
      }
    )
    return files[0] ?? null
  }
  return null
}

async function resolveClaudeSessionFile(
  sessionId: string,
  projectsDir: string
): Promise<string | null> {
  const targetName = `${sessionId}.jsonl`
  const files = await walkSessionFiles(projectsDir, 'claude', [], {
    extensions: new Set(['.jsonl']),
    filePredicate: (path) => basename(path) === targetName
  })
  return files[0] ?? null
}

async function resolveCodexSessionFile(
  sessionId: string,
  sessionsDirs: string[]
): Promise<string | null> {
  // Codex rollout file names embed the session id (rollout-<ts>-<id>.jsonl), so
  // match the id as a suffix of the file's base name rather than an exact name.
  // Search each candidate root (managed home first) and stop at the first match.
  for (const sessionsDir of sessionsDirs) {
    if (!existsSync(sessionsDir)) {
      continue
    }
    const files = await walkSessionFiles(sessionsDir, 'codex', [], {
      extensions: new Set(['.jsonl']),
      filePredicate: (path) => {
        const name = basename(path, extname(path))
        return name === sessionId || name.endsWith(`-${sessionId}`)
      }
    })
    if (files[0]) {
      return files[0]
    }
  }
  return null
}

/** [FORK] Дискавери cursor-сессии без хуков: cursor-agent не интегрирован с
 *  hook-реле Orca, поэтому id сессии узнаётся с диска — берём самый свежий
 *  транскрипт проекта (по mtime), появившийся/обновлявшийся после запуска. */
export async function discoverLatestCursorSession(
  cwd: string,
  options: { cursorProjectsDir?: string; minMtimeMs?: number } = {}
): Promise<{ sessionId: string; transcriptPath: string } | null> {
  const projectDir = join(
    options.cursorProjectsDir ?? cursorProjectsDir(),
    cursorProjectSlug(cwd),
    'agent-transcripts'
  )
  if (!existsSync(projectDir)) {
    return null
  }
  const { readdir, stat } = await import('node:fs/promises')
  let best: { sessionId: string; transcriptPath: string; mtimeMs: number } | null = null
  let entries: string[]
  try {
    entries = await readdir(projectDir)
  } catch {
    return null
  }
  for (const entry of entries) {
    const transcriptPath = join(projectDir, entry, `${entry}.jsonl`)
    try {
      const info = await stat(transcriptPath)
      if (options.minMtimeMs !== undefined && info.mtimeMs < options.minMtimeMs) {
        continue
      }
      if (!best || info.mtimeMs > best.mtimeMs) {
        best = { sessionId: entry, transcriptPath, mtimeMs: info.mtimeMs }
      }
    } catch {
      // не транскрипт-каталог — пропускаем
    }
  }
  return best ? { sessionId: best.sessionId, transcriptPath: best.transcriptPath } : null
}

// [FORK] Claude encodes each cwd as one `~/.claude/projects/<slug>` dir, slug =
// the runtime-normalized path with every non-alphanumeric char mapped to '-'.
// Mirrors ai-vault/session-scanner-scope-discovery's encodeClaudeProjectPath so
// discovery targets the exact dir Claude writes transcripts into.
function encodeClaudeProjectSlug(cwd: string): string {
  return normalizeRuntimePathForComparison(cwd).replace(/[^a-zA-Z0-9]/g, '-')
}

/**
 * [FORK] Disk discovery of a Claude session without a live hook binding. The
 * hook-reported providerSession lives only in renderer memory and is lost on any
 * reload/dev-restart; an idle agent never re-emits it, so its native chat has no
 * session id and renders empty even though the transcript is on disk. When no
 * live/sleeping session resolves, the view falls back to the freshest transcript
 * (by mtime) in the pane cwd's Claude project dir. `minMtimeMs` (optional) bounds
 * it to files touched after a reference time. Returns null when none exists.
 */
export async function discoverLatestClaudeSession(
  cwd: string,
  options: { claudeProjectsDir?: string; minMtimeMs?: number } = {}
): Promise<{ sessionId: string; transcriptPath: string } | null> {
  const projectDir = join(
    options.claudeProjectsDir ?? claudeProjectsDir(),
    encodeClaudeProjectSlug(cwd)
  )
  if (!existsSync(projectDir)) {
    return null
  }
  const { readdir, stat } = await import('node:fs/promises')
  let entries: string[]
  try {
    entries = await readdir(projectDir)
  } catch {
    return null
  }
  let best: { sessionId: string; transcriptPath: string; mtimeMs: number } | null = null
  for (const entry of entries) {
    if (extname(entry) !== '.jsonl') {
      continue
    }
    const transcriptPath = join(projectDir, entry)
    try {
      const info = await stat(transcriptPath)
      if (!info.isFile()) {
        continue
      }
      if (options.minMtimeMs !== undefined && info.mtimeMs < options.minMtimeMs) {
        continue
      }
      if (!best || info.mtimeMs > best.mtimeMs) {
        best = { sessionId: basename(entry, '.jsonl'), transcriptPath, mtimeMs: info.mtimeMs }
      }
    } catch {
      // Raced deletion / unreadable file — skip it.
    }
  }
  return best ? { sessionId: best.sessionId, transcriptPath: best.transcriptPath } : null
}
