import { describe, expect, it } from 'vitest'
import {
  deriveNativeChatStreamingText,
  nativeChatStreamingMessage,
  NATIVE_CHAT_STREAMING_ID
} from './native-chat-streaming'
import type { NativeChatMessage } from './native-chat-types'

const assistant = (text: string): NativeChatMessage => ({
  id: `a-${text.length}`,
  role: 'assistant',
  blocks: [{ type: 'text', text }],
  timestamp: null,
  source: 'transcript'
})
const user = (text: string): NativeChatMessage => ({
  id: `u-${text.length}`,
  role: 'user',
  blocks: [{ type: 'text', text }],
  timestamp: null,
  source: 'transcript'
})

describe('deriveNativeChatStreamingText', () => {
  it('returns null when not working (stale preview never shows)', () => {
    expect(
      deriveNativeChatStreamingText({
        messages: [],
        previewText: 'Hello there',
        working: false,
        agent: 'codex'
      })
    ).toBeNull()
  })

  it('returns null for empty / whitespace preview', () => {
    expect(
      deriveNativeChatStreamingText({
        messages: [],
        previewText: '',
        working: true,
        agent: 'codex'
      })
    ).toBeNull()
    expect(
      deriveNativeChatStreamingText({
        messages: [],
        previewText: '   ',
        working: true,
        agent: 'codex'
      })
    ).toBeNull()
  })

  it('shows the preview while it leads an empty/user-tailed transcript', () => {
    expect(
      deriveNativeChatStreamingText({
        messages: [user('do the thing')],
        previewText: 'Working on it',
        working: true,
        agent: 'codex'
      })
    ).toBe('Working on it')
  })

  it('drops the preview once the real assistant turn contains it (no duplicate)', () => {
    expect(
      deriveNativeChatStreamingText({
        messages: [assistant('Working on it, here is the full answer.')],
        previewText: 'Working on it',
        working: true,
        agent: 'codex'
      })
    ).toBeNull()
  })

  it('drops the preview when it is not longer than the last assistant turn (no flicker)', () => {
    expect(
      deriveNativeChatStreamingText({
        messages: [assistant('Same length text')],
        previewText: 'Same length text',
        working: true,
        agent: 'codex'
      })
    ).toBeNull()
  })

  it('keeps showing while the preview still leads (grows past the last turn)', () => {
    // The transcript hasn't flushed the new content yet; preview is longer.
    expect(
      deriveNativeChatStreamingText({
        messages: [assistant('Partial')],
        previewText: 'Partial answer that is now much longer than before',
        working: true,
        agent: 'codex'
      })
    ).toBe('Partial answer that is now much longer than before')
  })

  it('suppresses the bubble for Claude, whose preview is tool output not prose', () => {
    // Claude's hook feeds PostToolUse(Failure) text into lastAssistantMessage
    // ("File does not exist…"), so a prose bubble from it would stream raw tool
    // results. Its incremental output arrives via the transcript tail instead.
    expect(
      deriveNativeChatStreamingText({
        messages: [user('read the file')],
        previewText: 'File does not exist. Note: your current working directory is /repo.',
        working: true,
        agent: 'claude'
      })
    ).toBeNull()
  })
})

describe('nativeChatStreamingMessage', () => {
  it('builds a stable-id assistant hook message', () => {
    const m = nativeChatStreamingMessage('hi')
    expect(m.id).toBe(NATIVE_CHAT_STREAMING_ID)
    expect(m.role).toBe('assistant')
    expect(m.source).toBe('hook')
    expect(m.blocks).toEqual([{ type: 'text', text: 'hi' }])
  })
})
