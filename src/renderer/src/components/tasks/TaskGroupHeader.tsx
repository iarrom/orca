/** [FORK] Grouped-list section band (Linear-parity Tasks page). Full-width
 *  header matching Linear's anatomy: collapse chevron on hover, state/priority
 *  glyph, name, count, trailing + to create an issue in that group. */
import React from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LinearPriorityIcon } from '@/components/linear-priority-icon'
import type { LinearGroupSection } from './linear-issue-list-model'
import { LinearStateIcon } from './LinearStateIcon'

type TaskGroupHeaderProps = {
  section: LinearGroupSection
  collapsed: boolean
  onToggleCollapsed: (sectionKey: string) => void
  onNewIssue?: (section: LinearGroupSection) => void
}

export function TaskGroupHeader({
  section,
  collapsed,
  onToggleCollapsed,
  onNewIssue
}: TaskGroupHeaderProps): React.JSX.Element {
  return (
    <div
      className="group/header flex h-9 flex-none items-center gap-2 bg-muted/40 pl-4 pr-3"
      data-collapsed={collapsed ? 'true' : undefined}
    >
      <button
        type="button"
        onClick={() => onToggleCollapsed(section.key)}
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? translate('auto.components.tasks.group.expand', 'Expand {{value0}}', {
                value0: section.label
              })
            : translate('auto.components.tasks.group.collapse', 'Collapse {{value0}}', {
                value0: section.label
              })
        }
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:text-foreground',
          // Why: Linear keeps headers quiet — the chevron appears on hover
          // (or stays visible while collapsed so the fold isn't invisible).
          collapsed ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
        )}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {section.state ? (
        <LinearStateIcon
          type={section.state.type}
          color={section.state.color}
          className="size-3.5 shrink-0"
        />
      ) : section.priority !== undefined ? (
        <LinearPriorityIcon priority={section.priority} className="size-3.5 shrink-0" />
      ) : null}
      <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
        {section.label}
      </span>
      <span className="shrink-0 text-[12px] text-muted-foreground">{section.issues.length}</span>
      <div className="ml-auto flex items-center">
        {onNewIssue ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 transition group-hover/header:opacity-100"
                onClick={() => onNewIssue(section)}
                aria-label={translate(
                  'auto.components.tasks.group.newIssue',
                  'New issue in {{value0}}',
                  { value0: section.label }
                )}
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.tasks.group.newIssue', 'New issue in {{value0}}', {
                value0: section.label
              })}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
