// Shared derivation for the in-flight "streaming" assistant bubble. While an
// agent works, its hook preview (lastAssistantMessage) is shown as a synthetic
// assistant message so the user sees the reply build in real time, before the
// completed turn is flushed to the transcript. Desktop and mobile both use this
// so the show/hide rule can't drift between platforms.

import type { AgentType, NativeChatMessage } from './native-chat-types'

/** The synthetic streaming bubble's stable id (kept stable so the list keys it
 *  consistently across ticks and the real turn can replace it cleanly). */
export const NATIVE_CHAT_STREAMING_ID = 'streaming'

// [FORK] Agents whose live `lastAssistantMessage` carries TOOL ACTIVITY, not
// assistant prose, while working. Claude's hook feeds every PostToolUse /
// PostToolUseFailure text into that field (tool output, "File does not exist…"),
// so synthesizing a prose bubble from it streams raw tool results into the chat.
// Real prose only lands at Stop (working already false), and incremental output
// arrives via the transcript tail — so the synthetic bubble is pure noise here
// and is suppressed. Agents that stream genuine partial prose keep it.
const AGENTS_WITHOUT_PROSE_PREVIEW: ReadonlySet<AgentType> = new Set(['claude'])

/** [FORK] Text of the transcript's last assistant message that carries prose —
 *  the committed-answer baseline the TUI-scraped live preview is diffed against
 *  (see claude-tui-live-preview.ts). */
export function lastAssistantProseText(messages: readonly NativeChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = assistantText(messages[i])
    if (text.length > 0) {
      return text
    }
  }
  return ''
}

/** Concatenated text of an assistant message's text blocks, trimmed. */
function assistantText(message: NativeChatMessage | undefined): string {
  if (!message || message.role !== 'assistant') {
    return ''
  }
  return message.blocks
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim()
}

/**
 * Decide the streaming text to show, or null to show nothing. Returns the
 * preview only while it leads the transcript — i.e. it's longer than (and not
 * already contained in) the last assistant turn. Once the real turn lands with
 * the same (or more) text, the preview is suppressed so the bubble doesn't
 * duplicate or flicker as the transcript catches up.
 *
 * `working` gates it: a stale preview from a finished turn never shows.
 */
export function deriveNativeChatStreamingText(args: {
  messages: readonly NativeChatMessage[]
  previewText: string | null | undefined
  working: boolean
  /** The pane's agent; agents whose preview is tool activity get no bubble. */
  agent: AgentType
}): string | null {
  const { messages, previewText, working, agent } = args
  if (!working) {
    return null
  }
  // [FORK] Skip agents whose `lastAssistantMessage` is tool output, not prose.
  if (AGENTS_WITHOUT_PROSE_PREVIEW.has(agent)) {
    return null
  }
  const text = previewText?.trim()
  if (!text) {
    return null
  }
  const lastText = assistantText(messages.at(-1))
  if (lastText.includes(text) || text.length <= lastText.length) {
    return null
  }
  return text
}

/** Build the synthetic streaming assistant message for the given text. */
export function nativeChatStreamingMessage(text: string): NativeChatMessage {
  return {
    id: NATIVE_CHAT_STREAMING_ID,
    role: 'assistant',
    blocks: [{ type: 'text', text }],
    timestamp: null,
    source: 'hook'
  }
}
