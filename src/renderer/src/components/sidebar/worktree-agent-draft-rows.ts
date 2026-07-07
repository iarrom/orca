// [FORK] Черновые строки агентов: таб с launchAgent, у которого ещё нет ни
// hook-статуса, ни title-детекции, сразу виден строкой в сайдбаре (как
// «New Agent» в Cursor) — с синтетическим ключом `tabId:`, который панель
// агентов использует для выбора ещё не отчитавшейся сессии.
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import type { TerminalTab } from '../../../../shared/types'

export function buildDraftAgentRows(
  tabs: readonly TerminalTab[],
  rowTabIds: ReadonlySet<string>
): DashboardAgentRow[] {
  const rows: DashboardAgentRow[] = []
  for (const tab of tabs) {
    if (!tab.launchAgent || rowTabIds.has(tab.id)) {
      continue
    }
    const draftPaneKey = `${tab.id}:`
    rows.push({
      paneKey: draftPaneKey,
      entry: {
        state: 'done',
        prompt: '',
        updatedAt: tab.createdAt,
        stateStartedAt: tab.createdAt,
        stateHistory: [],
        agentType: tab.launchAgent,
        paneKey: draftPaneKey
      },
      tab,
      agentType: tab.launchAgent,
      rowSource: 'live',
      state: 'idle',
      startedAt: tab.createdAt
    })
  }
  return rows
}
