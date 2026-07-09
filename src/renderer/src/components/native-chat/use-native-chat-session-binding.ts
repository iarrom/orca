// [FORK] Хук, связывающий живой hook-providerSession пейна с его персистентным
// биндингом: пишет id/transcript в localStorage, пока агент активен, и отдаёт
// сохранённый биндинг как фолбэк, когда живой сессии нет (idle-агент после
// reload). Это замена дисковому «самому свежему транскрипту» для агентов с
// hook-реле (claude/codex) — без кросс-тока между агентами одного проекта.
import { useEffect, useState } from 'react'
import type { AgentType } from '../../../../shared/agent-status-types'
import {
  readNativeChatSessionBinding,
  writeNativeChatSessionBinding,
  type NativeChatSessionBinding
} from './native-chat-session-binding-cache'

export function useNativeChatSessionBinding(args: {
  paneKey: string
  agent: AgentType
  /** Живой id сессии из hook/сна, или null пока агент его не сообщил. */
  liveSessionId: string | null
  liveTranscriptPath: string | null
}): NativeChatSessionBinding | null {
  const { paneKey, agent, liveSessionId, liveTranscriptPath } = args
  const [cached, setCached] = useState<NativeChatSessionBinding | null>(() =>
    readNativeChatSessionBinding(paneKey, agent)
  )

  // Пере-читать сохранённый биндинг при смене идентичности пейна/агента.
  useEffect(() => {
    setCached(readNativeChatSessionBinding(paneKey, agent))
  }, [paneKey, agent])

  // Сохранить живой биндинг, чтобы reload восстановил ИМЕННО эту сессию, а не
  // угадывал свежайший транскрипт в общей папке проекта.
  useEffect(() => {
    if (!liveSessionId) {
      return
    }
    const binding: NativeChatSessionBinding = {
      agent,
      sessionId: liveSessionId,
      transcriptPath: liveTranscriptPath
    }
    writeNativeChatSessionBinding(paneKey, binding)
    setCached(binding)
  }, [paneKey, agent, liveSessionId, liveTranscriptPath])

  // Живая сессия всегда приоритетнее; кэш подставляется только когда её нет.
  return liveSessionId ? null : cached
}
