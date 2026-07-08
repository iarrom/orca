// [FORK] Дискавери cursor-сессии: у cursor-agent нет hook-реле, id сессии не
// приходит в agent-status — опрашиваем main (диск проекта) раз в пару секунд,
// пока транскрипт не появится. Для остальных агентов хук инертен.
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { findWorktreeById } from '@/store/slices/worktree-helpers'
import type { AgentType } from '../../../../shared/agent-status-types'

const CURSOR_DISCOVERY_POLL_MS = 2000

export type DiscoveredCursorSession = { sessionId: string; transcriptPath: string }

export function useCursorSessionDiscovery(args: {
  agent: AgentType
  terminalTabId: string
  /** Сессия уже известна (hook/сон) — дискавери не нужен. */
  hasSession: boolean
}): DiscoveredCursorSession | null {
  const { agent, terminalTabId, hasSession } = args
  const [discovered, setDiscovered] = useState<DiscoveredCursorSession | null>(null)
  const enabled = agent === 'cursor' && !hasSession && discovered === null

  useEffect(() => {
    if (!enabled) {
      return
    }
    const state = useAppStore.getState()
    let cwd: string | null = null
    for (const [worktreeId, tabs] of Object.entries(state.tabsByWorktree)) {
      if ((tabs ?? []).some((tab) => tab.id === terminalTabId)) {
        cwd = findWorktreeById(state.worktreesByRepo, worktreeId)?.path ?? null
        break
      }
    }
    if (!cwd) {
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const probe = (): void => {
      window.api.nativeChat
        .discoverCursorSession(cwd as string)
        .then((found) => {
          if (cancelled) {
            return
          }
          if (found) {
            setDiscovered(found)
          } else {
            timer = setTimeout(probe, CURSOR_DISCOVERY_POLL_MS)
          }
        })
        .catch(() => {
          if (!cancelled) {
            timer = setTimeout(probe, CURSOR_DISCOVERY_POLL_MS)
          }
        })
    }
    probe()
    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [enabled, terminalTabId])

  return discovered
}
