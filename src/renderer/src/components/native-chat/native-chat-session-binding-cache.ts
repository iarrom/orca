// [FORK] Персистентный per-pane биндинг сессии агента.
//
// Все агенты одного cwd пишут транскрипты в общую папку проекта
// (`~/.claude/projects/<slug>`), поэтому «самый свежий файл по mtime» указывает
// на того, кто печатает СЕЙЧАС, а не на нашу сессию. Из-за этого чистый/idle
// агент, потерявший живой hook-биндинг (reload/dev-restart), наследовал чат
// соседнего активного агента.
//
// Живой providerSession известен из hook только пока агент активен и живёт лишь
// в памяти рендерера. Здесь мы сохраняем его в localStorage под КЛЮЧОМ ПЕЙНА
// (`${tabId}:${leafId}` стабилен между reload), чтобы после перезагрузки пейн
// восстановил ИМЕННО свою сессию, а не угадывал её по диску.
import type { AgentType } from '../../../../shared/agent-status-types'

const KEY_PREFIX = 'native-chat-session-binding:'

export type NativeChatSessionBinding = {
  agent: AgentType
  sessionId: string
  transcriptPath: string | null
}

function storageKey(paneKey: string): string {
  return `${KEY_PREFIX}${paneKey}`
}

/** Читает сохранённый биндинг пейна. Возвращает null, если его нет, он битый,
 *  или относится к другому типу агента (пейн переиспользован под новый агент). */
export function readNativeChatSessionBinding(
  paneKey: string,
  agent: AgentType
): NativeChatSessionBinding | null {
  try {
    const raw = window.localStorage.getItem(storageKey(paneKey))
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<NativeChatSessionBinding>
    if (parsed.agent !== agent || typeof parsed.sessionId !== 'string' || !parsed.sessionId) {
      return null
    }
    return {
      agent,
      sessionId: parsed.sessionId,
      transcriptPath: typeof parsed.transcriptPath === 'string' ? parsed.transcriptPath : null
    }
  } catch {
    return null
  }
}

export function writeNativeChatSessionBinding(
  paneKey: string,
  binding: NativeChatSessionBinding
): void {
  try {
    window.localStorage.setItem(storageKey(paneKey), JSON.stringify(binding))
  } catch {
    // localStorage может быть недоступен/переполнен — биндинг не критичен,
    // деградируем к пустому чату до следующего hook-события.
  }
}
