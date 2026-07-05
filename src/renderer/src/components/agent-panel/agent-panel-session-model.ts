// [FORK] Чистая модель полосы сессий панели агентов: превращает
// DashboardAgentRow-строки (тот же источник, что у сайдбара) в сессии-чипы,
// резолвит целевую сессию по выбору пользователя и находит PTY для отправки.
// DOM-free, тестируется без стора.
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import type { TerminalLayoutSnapshot, TerminalTab, TuiAgent } from '../../../../shared/types'
import type { AgentType } from '../../../../shared/agent-status-types'
import { parsePaneKey } from '../../../../shared/stable-pane-id'
import { agentPanelSessionKeyTabId } from './agent-panel-state'

export type AgentPanelSessionState = DashboardAgentRow['state'] | 'starting'

export type AgentPanelSession = {
  /** Ключ выбора: paneKey строки либо синтетический `tabId:` для только что
   *  запущенного агента, у которого ещё нет status-entry. */
  key: string
  tabId: string
  /** Реальный paneKey, когда известен (нужен NativeChatView / agent-status). */
  paneKey: string | null
  agent: AgentType | TuiAgent | null
  title: string
  state: AgentPanelSessionState
  /** null для синтетической «starting»-сессии. */
  row: DashboardAgentRow | null
  lineageDepth: 0 | 1
  startedAt: number
}

function terminalTabLabel(tab: Pick<TerminalTab, 'customTitle' | 'generatedTitle' | 'title'>) {
  return tab.customTitle ?? tab.generatedTitle ?? tab.title
}

/** Строки сайдбара + синтетические сессии для только что запущенных агентов
 *  (таб с launchAgent уже есть, а hook-статуса и title-детекции ещё нет). */
export function buildAgentPanelSessions(
  rows: readonly DashboardAgentRow[],
  tabs: readonly TerminalTab[]
): AgentPanelSession[] {
  const sessions: AgentPanelSession[] = rows.map((row) => ({
    key: row.paneKey,
    tabId: row.tab.id,
    paneKey: row.paneKey,
    agent: row.agentType !== 'unknown' ? row.agentType : (row.tab.launchAgent ?? row.agentType),
    title: terminalTabLabel(row.tab),
    state: row.state,
    row,
    lineageDepth: row.lineage?.depth ?? 0,
    startedAt: row.startedAt
  }))
  const coveredTabIds = new Set(sessions.map((session) => session.tabId))
  for (const tab of tabs) {
    if (!tab.launchAgent || coveredTabIds.has(tab.id)) {
      continue
    }
    sessions.push({
      key: `${tab.id}:`,
      tabId: tab.id,
      paneKey: null,
      agent: tab.launchAgent,
      title: terminalTabLabel(tab),
      state: 'starting',
      row: null,
      lineageDepth: 0,
      startedAt: tab.createdAt
    })
  }
  return sessions
}

/** Целевая сессия панели: явный выбор (пока жив) → сессия активного таба →
 *  самая свежая. Выбор матчится по точному ключу, затем по tabId — paneKey
 *  может смениться после рестарта/сплита, а таб остаётся тем же. */
export function resolveAgentPanelTargetSession(
  sessions: readonly AgentPanelSession[],
  selectedSessionKey: string | null | undefined,
  activeTabId: string | null | undefined
): AgentPanelSession | null {
  if (sessions.length === 0) {
    return null
  }
  if (selectedSessionKey) {
    const exact = sessions.find((session) => session.key === selectedSessionKey)
    if (exact) {
      return exact
    }
    const selectedTabId = agentPanelSessionKeyTabId(selectedSessionKey)
    const sameTab = sessions.find((session) => session.tabId === selectedTabId)
    if (sameTab) {
      return sameTab
    }
  }
  if (activeTabId) {
    const activeRow = sessions.find((session) => session.tabId === activeTabId)
    if (activeRow) {
      return activeRow
    }
  }
  return sessions.reduce((latest, session) =>
    session.startedAt > latest.startedAt ? session : latest
  )
}

/** PTY для отправки в сессию: leaf-привязанный pty, если он ещё жив, иначе
 *  первый живой pty таба (повторяет резолв бывшего useActiveAgentTarget). */
export function resolveAgentPanelPtyId(
  session: Pick<AgentPanelSession, 'tabId' | 'paneKey'>,
  ptyIdsByTabId: Record<string, string[] | undefined>,
  terminalLayoutsByTabId: Record<string, TerminalLayoutSnapshot | undefined>,
  tabPtyId?: string | null
): string | null {
  const tabPtyIds = ptyIdsByTabId[session.tabId] ?? []
  const leafId = session.paneKey ? parsePaneKey(session.paneKey)?.leafId : undefined
  const leafPty = leafId
    ? terminalLayoutsByTabId[session.tabId]?.ptyIdsByLeafId?.[leafId]
    : undefined
  if (leafPty && tabPtyIds.includes(leafPty)) {
    return leafPty
  }
  return tabPtyIds[0] ?? tabPtyId ?? null
}
