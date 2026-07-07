import { describe, expect, it } from 'vitest'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import { normalizeImageTranscriptMessages } from './native-chat-image-transcript-markers'

function userText(id: string, text: string): NativeChatMessage {
  return {
    id,
    role: 'user',
    blocks: [{ type: 'text', text }],
    timestamp: 1,
    source: 'transcript'
  }
}

describe('normalizeImageTranscriptMessages', () => {
  it('merges the paired [Image: source]/[Image #1] turns into one image-ref turn', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image: source: /tmp/orca-paste-1-2.png]'),
      userText('b', '[Image #1] describe this')
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.blocks).toEqual([
      { type: 'image-ref', path: '/tmp/orca-paste-1-2.png' },
      { type: 'text', text: 'describe this' }
    ])
  })

  it('converts a lone [Image: source] turn (no prompt) into an image-ref instead of raw text', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image: source: /Users/me/Pictures/hero-image-2.png]')
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.blocks).toEqual([
      { type: 'image-ref', path: '/Users/me/Pictures/hero-image-2.png' }
    ])
  })

  it('merges the pair when the prompt sorted BEFORE its image turn (UUID tie-break)', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image #1] describe this'),
      userText('b', '[Image: source: /tmp/orca-paste-1-2.png]')
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.blocks).toEqual([
      { type: 'image-ref', path: '/tmp/orca-paste-1-2.png' },
      { type: 'text', text: 'describe this' }
    ])
  })

  it('folds a multi-image run into the single following prompt', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image: source: /tmp/one.png]'),
      userText('b', '[Image: source: /tmp/two.png]'),
      userText('c', '[Image #1] [Image #2] compare them')
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.blocks).toEqual([
      { type: 'image-ref', path: '/tmp/one.png' },
      { type: 'image-ref', path: '/tmp/two.png' },
      { type: 'text', text: 'compare them' }
    ])
  })

  it('folds a reversed multi-image run into the preceding prompt', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image #1] [Image #2] compare them'),
      userText('b', '[Image: source: /tmp/one.png]'),
      userText('c', '[Image: source: /tmp/two.png]')
    ])
    expect(out).toHaveLength(1)
    expect(out[0]!.blocks).toEqual([
      { type: 'image-ref', path: '/tmp/one.png' },
      { type: 'image-ref', path: '/tmp/two.png' },
      { type: 'text', text: 'compare them' }
    ])
  })

  it('does not fold an image turn into a prompt across an assistant reply', () => {
    const assistant: NativeChatMessage = {
      id: 'x',
      role: 'assistant',
      blocks: [{ type: 'text', text: 'ok' }],
      timestamp: 1,
      source: 'transcript'
    }
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image #1] describe this'),
      assistant,
      userText('b', '[Image: source: /tmp/late.png]')
    ])
    expect(out).toHaveLength(3)
    expect(out[0]!.blocks).toEqual([{ type: 'text', text: 'describe this' }])
    expect(out[2]!.blocks).toEqual([{ type: 'image-ref', path: '/tmp/late.png' }])
  })

  it('keeps lone image turns as separate chips when no prompt is adjacent', () => {
    const out = normalizeImageTranscriptMessages([
      userText('a', '[Image: source: /tmp/one.png]'),
      userText('b', '[Image: source: /tmp/two.png]')
    ])
    expect(out).toHaveLength(2)
    expect(out[0]!.blocks).toEqual([{ type: 'image-ref', path: '/tmp/one.png' }])
    expect(out[1]!.blocks).toEqual([{ type: 'image-ref', path: '/tmp/two.png' }])
  })

  it('leaves ordinary user text untouched', () => {
    const out = normalizeImageTranscriptMessages([userText('a', 'how about this')])
    expect(out[0]!.blocks).toEqual([{ type: 'text', text: 'how about this' }])
  })

  it('leaves assistant messages untouched', () => {
    const assistant: NativeChatMessage = {
      id: 'a',
      role: 'assistant',
      blocks: [{ type: 'text', text: '[Image: source: /tmp/x.png]' }],
      timestamp: 1,
      source: 'transcript'
    }
    expect(normalizeImageTranscriptMessages([assistant])).toEqual([assistant])
  })
})
