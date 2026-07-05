// [FORK] Признак «панельной» агент-сессии. Такие терминальные табы живут в
// колонке агент-чата (полоса сессий), а не в центральном таб-баре: чипы
// фильтруются из таб-бара, а контент рендерится поверх тела панели.
import type { TerminalTab, TuiAgent } from '../../../../shared/types'
import type { AgentType } from '../../../../shared/agent-status-types'
import { isNativeChatSupportedAgent } from '../native-chat/native-chat-availability'

/** Рубильник всей фичи панели агент-сессий — дешёвый откат на случай
 *  проблемного upstream-мерджа: false возвращает агент-табы в таб-бар. */
export const AGENT_PANEL_ENABLED = true

export type AgentPanelSessionView = 'chat' | 'terminal'

/** Агент-таб, которым управляет панель (и который скрыт из таб-бара). */
export function isAgentPanelManagedTab(
  tab: Pick<TerminalTab, 'launchAgent'> | null | undefined
): boolean {
  return AGENT_PANEL_ENABLED && Boolean(tab?.launchAgent)
}

/** Режим отображения сессии по умолчанию: chat, если у агента есть
 *  native-chat-рендеринг (claude/openclaude/codex); иначе живой терминал. */
export function defaultAgentPanelSessionView(
  agent: TuiAgent | AgentType | null | undefined
): AgentPanelSessionView {
  return isNativeChatSupportedAgent(agent) ? 'chat' : 'terminal'
}
