// [FORK] Дисковый дискавери сессии cursor-agent: он вообще не шлёт hook-сессию,
// поэтому id можно узнать только с диска — берём свежайший транскрипт проекта.
//
// Claude/codex НАМЕРЕННО исключены: у них есть hook-providerSession, который мы
// персистим per-pane (useNativeChatSessionBinding). Дисковый «самый свежий
// транскрипт» ловит того, кто печатает СЕЙЧАС, а все агенты одного cwd пишут в
// общую папку проекта — из-за этого чистый/idle claude-агент наследовал чат
// соседа. Персистентный биндинг решает reload-восстановление без кросс-тока.
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { findWorktreeById } from '@/store/slices/worktree-helpers'
import type { AgentType } from '../../../../shared/agent-status-types'

const DISK_DISCOVERY_POLL_MS = 2000

export type DiscoveredSession = { sessionId: string; transcriptPath: string }

/** Agents whose session id can only be recovered from disk (no hook relay). */
function isDiskDiscoverableAgent(agent: AgentType): boolean {
  return agent === 'cursor'
}

export function useDiskSessionDiscovery(args: {
  agent: AgentType
  terminalTabId: string
  /** Сессия уже известна (hook/сон) — дискавери не нужен. */
  hasSession: boolean
}): DiscoveredSession | null {
  const { agent, terminalTabId, hasSession } = args
  const [discovered, setDiscovered] = useState<DiscoveredSession | null>(null)
  const enabled = isDiskDiscoverableAgent(agent) && !hasSession && discovered === null

  useEffect(() => {
    if (!enabled) {
      return
    }
    const state = useAppStore.getState()
    let cwd: string | null = null
    let tabCreatedAt: number | null = null
    for (const [worktreeId, tabs] of Object.entries(state.tabsByWorktree)) {
      const tab = (tabs ?? []).find((t) => t.id === terminalTabId)
      if (tab) {
        cwd = findWorktreeById(state.worktreesByRepo, worktreeId)?.path ?? null
        tabCreatedAt = tab.createdAt ?? null
        break
      }
    }
    if (!cwd) {
      return
    }
    // Только транскрипты новее таба (с буфером на рассинхрон часов/фс): все
    // агенты одного cwd пишут в общую папку проекта, поэтому «самый свежий файл»
    // не обязан быть НАШИМ — без этой границы чистый агент наследует чат соседа.
    // tab.createdAt переживает reload (persist), так что восстановление сессии
    // idle-агента после перезагрузки по-прежнему проходит.
    const minMtimeMs = tabCreatedAt !== null ? tabCreatedAt - 5000 : undefined
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const probe = (): void => {
      window.api.nativeChat
        .discoverCursorSession(cwd as string, minMtimeMs)
        .then((found) => {
          if (cancelled) {
            return
          }
          if (found) {
            setDiscovered(found)
          } else {
            timer = setTimeout(probe, DISK_DISCOVERY_POLL_MS)
          }
        })
        .catch(() => {
          if (!cancelled) {
            timer = setTimeout(probe, DISK_DISCOVERY_POLL_MS)
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
  }, [enabled, agent, terminalTabId])

  return discovered
}
