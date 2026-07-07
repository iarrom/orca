import {
  isTextBlock,
  type NativeChatBlock,
  type NativeChatMessage
} from '../../../../shared/native-chat-types'

const IMAGE_SOURCE_MARKER = /^\[Image:\s*source:\s*(.+?)\]\s*$/
// All leading markers at once: a multi-image prompt starts with several.
const IMAGE_PROMPT_MARKER = /^(?:\[Image #\d+\]\s*)+/

function soleText(message: NativeChatMessage): string | null {
  return message.blocks.length === 1 && isTextBlock(message.blocks[0])
    ? message.blocks[0].text
    : null
}

export function imageSourcePathFromText(text: string): string | null {
  return text.match(IMAGE_SOURCE_MARKER)?.[1]?.trim() ?? null
}

export function stripImagePromptMarker(text: string): string {
  return text.replace(IMAGE_PROMPT_MARKER, '')
}

function stripFirstImagePromptMarker(blocks: readonly NativeChatBlock[]): NativeChatBlock[] {
  let stripped = false
  const next: NativeChatBlock[] = []
  for (const block of blocks) {
    if (!stripped && isTextBlock(block)) {
      stripped = true
      const text = stripImagePromptMarker(block.text)
      if (text.trim().length > 0) {
        next.push({ ...block, text })
      }
      continue
    }
    next.push(block)
  }
  return next
}

function imagePromptMarkerStartsMessage(message: NativeChatMessage): boolean {
  const firstText = message.blocks.find(isTextBlock)
  return firstText ? IMAGE_PROMPT_MARKER.test(firstText.text) : false
}

/** Claude records an attached image as two user transcript turns:
 *  `[Image: source: /path]` and then `[Image #1] prompt`. Merge them back into
 *  one native turn so the UI keeps the same chip+text shape as the optimistic
 *  send and does not show raw TUI marker text after a view remount.
 *
 *  The pair's turns often share one timestamp, so the assembler's UUID
 *  tie-break can emit them in either order — the prompt is matched both ahead
 *  of and behind its image turns, and a run of consecutive image turns
 *  (multi-image send) folds into the same prompt. */
export function normalizeImageTranscriptMessages(
  messages: readonly NativeChatMessage[]
): NativeChatMessage[] {
  const normalized: NativeChatMessage[] = []
  // Index of the last pushed user prompt that carried an [Image #N] marker;
  // -1 once anything else lands after it (adjacency requirement).
  let markerPromptIndex = -1

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!
    if (message.role !== 'user') {
      normalized.push(message)
      markerPromptIndex = -1
      continue
    }
    const firstImagePath = imageSourcePathFromText(soleText(message) ?? '')
    if (!firstImagePath) {
      const hadMarker = imagePromptMarkerStartsMessage(message)
      normalized.push({
        ...message,
        blocks: stripFirstImagePromptMarker(message.blocks)
      })
      markerPromptIndex = hadMarker ? normalized.length - 1 : -1
      continue
    }

    // Collect the run of consecutive image-source turns (multi-image sends).
    const paths = [firstImagePath]
    let cursor = index
    while (cursor + 1 < messages.length) {
      const candidate = messages[cursor + 1]!
      const path =
        candidate.role === 'user' && candidate.source === message.source
          ? imageSourcePathFromText(soleText(candidate) ?? '')
          : null
      if (!path) {
        break
      }
      paths.push(path)
      cursor += 1
    }
    const imageBlocks = paths.map((path) => ({ type: 'image-ref' as const, path }))

    const next = messages[cursor + 1]
    if (
      next?.role === 'user' &&
      next.source === message.source &&
      imagePromptMarkerStartsMessage(next)
    ) {
      normalized.push({
        ...next,
        blocks: [...imageBlocks, ...stripFirstImagePromptMarker(next.blocks)]
      })
      markerPromptIndex = normalized.length - 1
      index = cursor + 1
      continue
    }

    // Reversed order: the prompt sorted before its image turns — fold the run
    // into that already-pushed bubble.
    const prompt = markerPromptIndex >= 0 ? normalized[markerPromptIndex] : undefined
    if (prompt && prompt.source === message.source && markerPromptIndex === normalized.length - 1) {
      normalized[markerPromptIndex] = {
        ...prompt,
        blocks: [...imageBlocks, ...prompt.blocks]
      }
      index = cursor
      continue
    }

    // A lone image run (no caption in either direction) still renders as image
    // chips rather than the raw marker text — one chip turn per source turn.
    for (let offset = 0; offset < paths.length; offset += 1) {
      normalized.push({
        ...messages[index + offset]!,
        blocks: [imageBlocks[offset]!]
      })
    }
    markerPromptIndex = -1
    index = cursor
  }
  return normalized
}
