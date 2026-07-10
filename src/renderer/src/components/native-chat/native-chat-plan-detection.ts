// [FORK] Detects the plan produced during Plan mode by scanning the assembled
// transcript for the agent's own write of a `Plans/<name>.md` file. This is the
// "plan created" signal that drives the status line, the docked Review Plan card,
// and the plan tab — no native plan mode, no fragile text markers. Pure so it
// stays unit-testable off the assembled session.

import {
  isToolCallBlock,
  isToolResultBlock,
  type NativeChatMessage
} from '../../../../shared/native-chat-types'
import { basename, joinPath } from '../../lib/path'
import {
  isNativeChatPlanFilePath,
  nativeChatPlanRelativePath,
  nativeChatPlanTitleAndPreview
} from './native-chat-plan-instruction'

/** Tool names that write file content, across Claude Code and Codex-style agents. */
const WRITE_TOOL_NAMES = new Set(['Write', 'create_file', 'str_replace_editor'])

/** Tool names that mutate an existing file (edits), across supported agents.
 *  Together with WRITE_TOOL_NAMES these are the "the agent changed a file" tools. */
const EDIT_TOOL_NAMES = new Set(['Edit', 'MultiEdit', 'NotebookEdit', 'str_replace', 'apply_patch'])

export type NativeChatDetectedPlan = {
  /** Absolute (or best-effort) path to the plan file, for reading + the tab. */
  path: string
  /** `Plans/<name>.md` suffix, for display and the execute message. */
  relativePath: string
  title: string
  preview: string
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)
}

function readStringField(input: unknown, keys: string[]): string | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const record = input as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}

/** The most recent `Plans/*.md` write in the transcript, or null. Title/preview
 *  come from the write's `content` when present (agents include it), else the
 *  filename. */
export function deriveLatestNativeChatPlan(
  messages: readonly NativeChatMessage[],
  worktreePath?: string
): NativeChatDetectedPlan | null {
  let latest: NativeChatDetectedPlan | null = null
  for (const message of messages) {
    for (const block of message.blocks) {
      if (!isToolCallBlock(block) || !WRITE_TOOL_NAMES.has(block.name)) {
        continue
      }
      const filePath = readStringField(block.input, ['file_path', 'path', 'filePath'])
      if (!filePath || !isNativeChatPlanFilePath(filePath, worktreePath)) {
        continue
      }
      const absolutePath =
        isAbsolutePath(filePath) || !worktreePath ? filePath : joinPath(worktreePath, filePath)
      const content = readStringField(block.input, ['content', 'file_text', 'new_str'])
      const { title, preview } = nativeChatPlanTitleAndPreview(
        content ?? '',
        basename(filePath).replace(/\.md$/i, '')
      )
      // Keep the LAST matching write so re-plans supersede earlier drafts.
      latest = {
        path: absolutePath,
        relativePath: nativeChatPlanRelativePath(filePath),
        title,
        preview
      }
    }
  }
  return latest
}

/** True when the agent is presently producing the plan: the most recent
 *  plan-producing tool call (a `Plans/*.md` write, or `ExitPlanMode`) has no
 *  tool-result after it yet — i.e. the write hasn't returned. Any tool-result
 *  clears the flag, so a resolved plan write followed by more research never
 *  reads as "creating" (the `plan != null` trap). Pure so it stays
 *  unit-testable off the assembled transcript. */
export function isNativeChatPlanStreaming(
  messages: readonly NativeChatMessage[],
  worktreePath?: string
): boolean {
  let planCallAwaitingResult = false
  for (const message of messages) {
    for (const block of message.blocks) {
      if (isToolResultBlock(block)) {
        planCallAwaitingResult = false
        continue
      }
      if (!isToolCallBlock(block)) {
        continue
      }
      if (block.name === 'ExitPlanMode') {
        planCallAwaitingResult = true
        continue
      }
      if (WRITE_TOOL_NAMES.has(block.name)) {
        const filePath = readStringField(block.input, ['file_path', 'path', 'filePath'])
        planCallAwaitingResult =
          filePath !== null && isNativeChatPlanFilePath(filePath, worktreePath)
      }
    }
  }
  return planCallAwaitingResult
}

/** True when a TUI live-action head (see claude-tui-live-preview) is a
 *  plan-producing call: a file-writing tool targeting `Plans/*.md`, or
 *  ExitPlanMode. This is the only signal available while the model is still
 *  GENERATING the plan content — the transcript's tool-call record only lands
 *  once the whole input finishes streaming. */
export function isPlanWriteLiveAction(action: string | null): boolean {
  if (!action) {
    return false
  }
  if (action.startsWith('ExitPlanMode(')) {
    return true
  }
  const parenIndex = action.indexOf('(')
  if (parenIndex <= 0 || !WRITE_TOOL_NAMES.has(action.slice(0, parenIndex))) {
    return false
  }
  return /(?:^|[\\/])Plans[\\/][^)]*\.md/.test(action.slice(parenIndex + 1))
}

/** True once the agent has started implementing the plan: after the most recent
 *  `Plans/*.md` write, a file-mutating tool call (write or edit) targets a
 *  NON-plan file. In Plan mode the agent only writes the plan, so any later
 *  real-file change means the plan is being executed — the docked Review Plan
 *  card is no longer actionable and should hide. A fresh plan write (re-plan)
 *  resets the signal so its own card shows until it too is implemented. Pure so
 *  it stays unit-testable off the assembled transcript. */
export function nativeChatPlanImplemented(
  messages: readonly NativeChatMessage[],
  worktreePath?: string
): boolean {
  let sawPlanWrite = false
  let implementedAfterPlan = false
  for (const message of messages) {
    for (const block of message.blocks) {
      if (!isToolCallBlock(block)) {
        continue
      }
      if (!WRITE_TOOL_NAMES.has(block.name) && !EDIT_TOOL_NAMES.has(block.name)) {
        continue
      }
      const filePath = readStringField(block.input, ['file_path', 'path', 'filePath'])
      if (!filePath) {
        continue
      }
      if (isNativeChatPlanFilePath(filePath, worktreePath)) {
        sawPlanWrite = true
        implementedAfterPlan = false
      } else if (sawPlanWrite) {
        implementedAfterPlan = true
      }
    }
  }
  return implementedAfterPlan
}
