// [FORK] Polls the pane's main-owned terminal buffer while a Claude agent
// works and parses the TUI viewport into a live preview (spinner status +
// in-flight prose). This is the only token-granular source available for a
// PTY-hosted agent: the JSONL transcript flushes whole content blocks, so it
// stays silent for the entire duration of a long reasoning/answer stretch.
import { useEffect, useState } from 'react'
import { parseClaudeTuiLivePreview, type ClaudeTuiLivePreview } from './claude-tui-live-preview'
import { decodeTuiViewportLines } from './tui-viewport-text'

// Why: the alt-screen snapshot is a few KB and the parse is linear in viewport
// rows, so a sub-second cadence is cheap; 300ms reads as continuous streaming.
const POLL_INTERVAL_MS = 300

export function useClaudeTuiLivePreview(args: {
  ptyId: string | null
  enabled: boolean
}): ClaudeTuiLivePreview | null {
  const { ptyId, enabled } = args
  const [preview, setPreview] = useState<ClaudeTuiLivePreview | null>(null)

  useEffect(() => {
    if (!enabled || !ptyId) {
      setPreview(null)
      return
    }
    let cancelled = false
    let inFlight = false
    let lastData: string | null = null

    const poll = async (): Promise<void> => {
      if (inFlight || cancelled) {
        return
      }
      inFlight = true
      try {
        // Remote/web panes resolve null here (no local main buffer) — the hook
        // then stays inert and the chat keeps its transcript-only behavior.
        const snapshot = await window.api.pty.getMainBufferSnapshot(ptyId, { scrollbackRows: 0 })
        if (cancelled || !snapshot || snapshot.data === lastData) {
          return
        }
        lastData = snapshot.data
        setPreview(parseClaudeTuiLivePreview(decodeTuiViewportLines(snapshot.data)))
      } catch {
        // Snapshot failures (pty died mid-poll) just skip a frame.
      } finally {
        inFlight = false
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
      setPreview(null)
    }
  }, [ptyId, enabled])

  return preview
}
