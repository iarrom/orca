// [FORK] Сворачиваемая секция «Агенты · N» вокруг инлайн-списка агентов под
// worktree-карточкой. Collapse-состояние — в fork-сторе панели агентов
// (персистится в localStorage). Перед toggle подавляем scroll-adjustment
// виртуализатора, как это делает WorktreeCardAgents для lineage-дисклоузеров.
import { ChevronDown } from 'lucide-react'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAgentPanelState } from '@/components/agent-panel/agent-panel-state'
import { useWorktreeAgentRows } from './useWorktreeAgentRows'
import { SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT } from './WorktreeCardAgents'

export function SidebarWorktreeAgentsSection({
  worktreeId,
  className,
  children
}: {
  worktreeId: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element | null {
  const rows = useWorktreeAgentRows(worktreeId, true)
  const collapsed = useAgentPanelState(
    (s) => s.sidebarAgentsCollapsedByWorktreeId[worktreeId] ?? false
  )
  const toggleCollapsed = useAgentPanelState((s) => s.toggleSidebarAgentsCollapsed)

  const onToggle = useCallback(
    (event: React.MouseEvent) => {
      // Заголовок секции не должен активировать worktree-карточку.
      event.stopPropagation()
      window.dispatchEvent(new CustomEvent(SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT))
      toggleCollapsed(worktreeId)
    },
    [toggleCollapsed, worktreeId]
  )

  if (rows.length === 0) {
    // Без агентов заголовок не нужен; сам список рендерим как upstream —
    // WorktreeCardAgents сам обрабатывает пустое состояние (и тесты карточки
    // ожидают его смонтированным).
    return <div className={className}>{children}</div>
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={cn(
          'flex w-full items-center gap-1 rounded-sm px-0.5 py-0.5 text-[11px] font-medium',
          'text-muted-foreground/70 transition-colors hover:text-muted-foreground',
          'hover:bg-worktree-sidebar-accent/55 dark:hover:bg-worktree-sidebar-foreground/[0.035]'
        )}
      >
        <ChevronDown
          className={cn('size-3 shrink-0 transition-transform', collapsed && '-rotate-90')}
        />
        <span className="min-w-0 truncate">Агенты · {rows.length}</span>
      </button>
      {collapsed ? null : children}
    </div>
  )
}

export default SidebarWorktreeAgentsSection
