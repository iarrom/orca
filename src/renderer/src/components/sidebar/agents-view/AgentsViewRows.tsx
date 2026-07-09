// [FORK] Строки агент-сессий Cursor-вида: обёртка над CompactAgentRow с
// активацией, пином, архивом и подсветкой фокуса. Правый клик открывает
// контекстное меню (Pin / Rename / Mark as Unread / Archive). Worktree строки
// не видно — клик активирует и воркспейс, и сессию.
import React, { useCallback, useState } from 'react'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import { useAgentPanelState } from '@/components/agent-panel/agent-panel-state'
import { activateWorktreeFromSidebar } from '@/lib/sidebar-worktree-activation'
import { useAppStore } from '@/store'
import { CompactAgentRow, getCompactAgentPrimary } from '../worktree-card-compact-agent-row'
import { activateWorktreeAgentRowTab, archiveWorktreeAgentRow } from '../worktree-agent-row-actions'
import { agentRowMatchesFocusedKey, useFocusedAgentPaneKey } from '../focused-agent-row-highlight'
import type { AgentsViewRow } from './use-agents-view-data'
import { AgentRowContextMenu } from './AgentRowContextMenu'
import { AgentRowRenameInput } from './AgentRowRenameInput'

export function AgentsViewAgentRowItem({
  row,
  now
}: {
  row: AgentsViewRow
  now: number
}): React.JSX.Element {
  const { worktreeId, agent, children } = row
  const pinnedAgentTabIds = useAgentPanelState((s) => s.pinnedAgentTabIds)
  const toggleAgentPinned = useAgentPanelState((s) => s.toggleAgentPinned)
  const acknowledgedAgentsByPaneKey = useAppStore((s) => s.acknowledgedAgentsByPaneKey)
  const manuallyUnreadAgentPaneKeys = useAppStore((s) => s.manuallyUnreadAgentPaneKeys)
  const acknowledgeAgents = useAppStore((s) => s.acknowledgeAgents)
  const markAgentsUnread = useAppStore((s) => s.markAgentsUnread)
  const clearAgentsManualUnread = useAppStore((s) => s.clearAgentsManualUnread)
  const setTabCustomTitle = useAppStore((s) => s.setTabCustomTitle)
  const focusedAgentPaneKey = useFocusedAgentPaneKey(worktreeId)
  const [childrenExpanded, setChildrenExpanded] = useState(true)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)

  const handleActivate = useCallback(
    (tabId: string, paneKey: string) => {
      activateWorktreeAgentRowTab(worktreeId, tabId, paneKey)
    },
    [worktreeId]
  )
  // Why: retained rows are hibernation evidence — the pane is gone, so jump to
  // the workspace itself (waking it if needed) instead of a dead pane focus.
  const handleActivateRetained = useCallback(() => {
    void activateWorktreeFromSidebar(worktreeId)
  }, [worktreeId])

  const renderRow = (agentRow: DashboardAgentRow, isRoot: boolean): React.JSX.Element => {
    const isPinned = Boolean(pinnedAgentTabIds[agentRow.tab.id])
    // Why: same is-unvisited rule as the inline list — a row is unread when no
    // ack post-dates the agent's current state (see WorktreeCardAgents).
    const ackAt = acknowledgedAgentsByPaneKey[agentRow.paneKey] ?? 0
    const autoUnread = ackAt < agentRow.entry.stateStartedAt
    const manualUnread = manuallyUnreadAgentPaneKeys[agentRow.paneKey] === true
    const isUnread = manualUnread || autoUnread

    if (renamingTabId === agentRow.tab.id) {
      return (
        <AgentRowRenameInput
          key={agentRow.paneKey}
          initialValue={getCompactAgentPrimary(agentRow)}
          onCommit={(value) => {
            // Пустое имя очищает customTitle → возврат к автозаголовку.
            setTabCustomTitle(agentRow.tab.id, value.length > 0 ? value : null)
            setRenamingTabId(null)
          }}
          onCancel={() => setRenamingTabId(null)}
        />
      )
    }

    return (
      <AgentRowContextMenu
        key={agentRow.paneKey}
        isPinned={isPinned}
        isUnread={isUnread}
        onTogglePin={() => toggleAgentPinned(agentRow.tab.id)}
        onRename={() => setRenamingTabId(agentRow.tab.id)}
        onToggleUnread={() => {
          if (isUnread) {
            clearAgentsManualUnread([agentRow.paneKey])
            acknowledgeAgents([agentRow.paneKey])
          } else {
            markAgentsUnread([agentRow.paneKey])
          }
        }}
        onArchive={() => archiveWorktreeAgentRow(agentRow, worktreeId)}
      >
        {/* Why: wrapper element carries the context-menu trigger ref/handlers —
            CompactAgentRow is memoized and does not forward refs itself. */}
        <div>
          <CompactAgentRow
            agent={agentRow}
            now={now}
            hideIdentityIcon
            hideSecondaryText
            // Why: rows read as the same card as project folders (Cursor look) —
            // full width, folder radius, text indented one level. h-7 matches the
            // folder row's py-1 + text-sm ≈ 28px.
            className="rounded-md pl-4 pr-2"
            isPinned={isPinned}
            isUnvisited={autoUnread}
            forceUnread={manualUnread}
            onTogglePin={() => toggleAgentPinned(agentRow.tab.id)}
            onArchive={() => archiveWorktreeAgentRow(agentRow, worktreeId)}
            onActivate={agentRow.rowSource === 'retained' ? handleActivateRetained : handleActivate}
            childAgentCount={isRoot && children.length > 0 ? children.length : undefined}
            childAgentsExpanded={childrenExpanded}
            onToggleChildAgents={
              isRoot && children.length > 0 ? () => setChildrenExpanded((v) => !v) : undefined
            }
            isFocusedPane={agentRowMatchesFocusedKey(agentRow.paneKey, focusedAgentPaneKey)}
          />
        </div>
      </AgentRowContextMenu>
    )
  }

  return (
    <>
      {renderRow(agent, true)}
      {children.length > 0 && childrenExpanded ? (
        <div className="flex flex-col gap-0.5 pl-4">
          {children.map((child) => renderRow(child, false))}
        </div>
      ) : null}
    </>
  )
}
