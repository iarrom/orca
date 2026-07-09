// [FORK] Фолбэк-источник sessionId/transcriptPath пейна, когда живой
// hook-providerSession недоступен (idle-агент после reload, либо cursor без
// hook-реле). Объединяет два механизма:
//   • claude/codex — персистентный per-pane биндинг (сохранён из hook);
//   • cursor — дисковый дискавери свежайшего транскрипта проекта.
// Живой providerSession (resolution.sessionId) всегда приоритетнее и
// разрешается вызывающим кодом до этих фолбэков.
import type { AgentType } from '../../../../shared/agent-status-types'
import { useDiskSessionDiscovery } from './use-disk-session-discovery'
import { useNativeChatSessionBinding } from './use-native-chat-session-binding'

export type NativeChatFallbackSession = {
  sessionId: string | null
  transcriptPath: string | null
}

export function useNativeChatFallbackSession(args: {
  paneKey: string
  agent: AgentType
  terminalTabId: string
  /** Живой id сессии из hook/сна, или null пока агент его не сообщил. */
  liveSessionId: string | null
  liveTranscriptPath: string | null
  /** Есть ли живой agentStatus-entry для пейна. true = агент запущен/работает в
   *  этом пейне ПРЯМО СЕЙЧАС (в т.ч. свежий запуск ещё без providerSession). */
  hasLiveEntry: boolean
}): NativeChatFallbackSession {
  const { paneKey, agent, terminalTabId, liveSessionId, liveTranscriptPath, hasLiveEntry } = args
  // Персистентный per-pane биндинг: сохраняет живой hook-id (пишется всегда) и
  // восстанавливает ИМЕННО эту сессию после reload.
  const persistedBinding = useNativeChatSessionBinding({
    paneKey,
    agent,
    liveSessionId,
    liveTranscriptPath
  })
  // Сохранённый биндинг применяем ТОЛЬКО когда живого entry нет (настоящий
  // reload/idle: agentStatusByPaneKey пуст). Если entry есть, но сессия ещё не
  // сообщена — это свежий запуск нового агента: наследовать прошлую сессию
  // пейна нельзя (иначе стриминг подменяется старым транскриптом). Зеркалит
  // guard в resolveNativeChatSession (fallback только при !agentStatusEntry).
  const restoredBinding = hasLiveEntry ? null : persistedBinding
  // Дисковый фолбэк только для cursor (у него нет hook-реле).
  const discoveredSession = useDiskSessionDiscovery({
    agent,
    terminalTabId,
    hasSession: Boolean(liveSessionId ?? restoredBinding?.sessionId)
  })
  return {
    sessionId: restoredBinding?.sessionId ?? discoveredSession?.sessionId ?? null,
    transcriptPath: restoredBinding?.transcriptPath ?? discoveredSession?.transcriptPath ?? null
  }
}
