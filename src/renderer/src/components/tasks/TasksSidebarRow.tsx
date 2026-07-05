/** [FORK] Tasks sidebar row + section-header primitives (Linear-parity Tasks
 *  page). Split from TasksNavSidebar.tsx so the sidebar stays under the
 *  max-lines budget. */
import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export function TasksSidebarRow({
  active,
  icon,
  label,
  onClick,
  trailing,
  indent
}: {
  active?: boolean
  icon?: React.ReactNode
  label: string
  onClick: () => void
  trailing?: React.ReactNode
  indent?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      data-current={active ? 'true' : undefined}
      className={cn(
        'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-sidebar-foreground/90 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
        indent && 'pl-7'
      )}
    >
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}

export function TasksSidebarSectionHeader({
  label,
  collapsed,
  onToggle
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="group/section flex h-6 w-full items-center gap-1 rounded px-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-sidebar-foreground/50 transition hover:text-sidebar-foreground/80"
    >
      <span className="truncate">{label}</span>
      {collapsed ? (
        <ChevronRight className="size-3 opacity-0 transition group-hover/section:opacity-100" />
      ) : (
        <ChevronDown className="size-3 opacity-0 transition group-hover/section:opacity-100" />
      )}
    </button>
  )
}
