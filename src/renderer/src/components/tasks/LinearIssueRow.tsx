/** [FORK] Linear-parity issue row (Linear-parity Tasks page). Anatomy mirrors
 *  Linear's list rows: priority icon → identifier → state glyph → title →
 *  label chips → project/cycle chips → due date → estimate → assignee avatar →
 *  updated date. Quick actions (start workspace, open in Linear) reveal on
 *  hover to keep the row quiet. */
import React from 'react'
import { ArrowRight, CalendarDays, ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LinearPriorityIcon } from '@/components/linear-priority-icon'
import type { LinearDisplayProperty } from '@/components/task-page-localized-options'
import type { LinearIssue } from '../../../../shared/types'
import { LinearStateIcon } from './LinearStateIcon'

type LinearIssueRowProps = {
  issue: LinearIssue
  selected: boolean
  displayProperties: ReadonlySet<LinearDisplayProperty>
  /** Prefix team/workspace when reading across workspaces. */
  showWorkspaceName?: boolean
  onOpen: (issue: LinearIssue) => void
  onStartWorkspace?: (issue: LinearIssue) => void
  onOpenExternal?: (issue: LinearIssue) => void
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate).getTime()
  return Number.isFinite(due) && due < Date.now()
}

export function LinearIssueRow({
  issue,
  selected,
  displayProperties,
  showWorkspaceName,
  onOpen,
  onStartWorkspace,
  onOpenExternal
}: LinearIssueRowProps): React.JSX.Element {
  const labels = issue.labels.slice(0, 3)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      data-current={selected ? 'true' : undefined}
      onClick={() => onOpen(issue)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) {
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(issue)
        }
      }}
      className={cn(
        'group/row flex h-11 cursor-pointer items-center gap-2 pl-4 pr-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        selected && 'bg-accent'
      )}
    >
      {displayProperties.has('priority') ? (
        <LinearPriorityIcon priority={issue.priority} className="size-3.5 shrink-0" />
      ) : null}
      <span className="w-16 shrink-0 truncate text-[12px] text-muted-foreground">
        {issue.identifier}
      </span>
      {displayProperties.has('state') ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex shrink-0 items-center">
              <LinearStateIcon
                type={issue.state.type}
                color={issue.state.color}
                className="size-3.5"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            {issue.state.name}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {issue.title}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
          {onStartWorkspace ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-contextual-tour-target="tasks-start-workspace"
                  onClick={(event) => {
                    event.stopPropagation()
                    onStartWorkspace(issue)
                  }}
                  aria-label={translate(
                    'auto.components.TaskPage.ff90d0abc7',
                    'Start workspace from {{value0}}',
                    { value0: issue.identifier }
                  )}
                >
                  <ArrowRight className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {translate(
                  'auto.components.TaskPage.ff90d0abc7',
                  'Start workspace from {{value0}}',
                  {
                    value0: issue.identifier
                  }
                )}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onOpenExternal ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenExternal(issue)
                  }}
                  aria-label={translate(
                    'auto.components.TaskPage.246bd64aed',
                    'Open {{value0}} in Linear',
                    { value0: issue.identifier }
                  )}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {translate('auto.components.TaskPage.246bd64aed', 'Open {{value0}} in Linear', {
                  value0: issue.identifier
                })}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {displayProperties.has('labels') && labels.length > 0 ? (
          <div className="hidden items-center gap-1 lg:flex">
            {labels.map((label) => (
              <span
                key={label}
                className="flex max-w-[120px] items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <span className="size-2 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
                <span className="truncate">{label}</span>
              </span>
            ))}
            {issue.labels.length > labels.length ? (
              <span className="text-[11px] text-muted-foreground">
                +{issue.labels.length - labels.length}
              </span>
            ) : null}
          </div>
        ) : null}

        {displayProperties.has('project') && issue.project ? (
          <span className="hidden max-w-[140px] items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground xl:flex">
            <span className="truncate">{issue.project.name}</span>
          </span>
        ) : null}

        {displayProperties.has('cycle') && issue.cycle ? (
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground xl:flex">
            {issue.cycle.name ??
              (issue.cycle.number !== undefined
                ? translate('auto.components.tasks.group.cycleNumber', 'Cycle {{number}}', {
                    number: issue.cycle.number
                  })
                : translate('auto.components.tasks.group.cycle', 'Cycle'))}
          </span>
        ) : null}

        {displayProperties.has('dueDate') && issue.dueDate ? (
          <span
            className={cn(
              'hidden shrink-0 items-center gap-1 text-[11px] md:flex',
              isOverdue(issue.dueDate) ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <CalendarDays className="size-3" />
            {formatShortDate(issue.dueDate)}
          </span>
        ) : null}

        {displayProperties.has('estimate') &&
        issue.estimate !== null &&
        issue.estimate !== undefined ? (
          <span className="hidden shrink-0 text-[11px] text-muted-foreground md:flex">
            {issue.estimate}
          </span>
        ) : null}

        {displayProperties.has('team') ? (
          <span className="hidden max-w-[120px] truncate text-[11px] text-muted-foreground xl:block">
            {showWorkspaceName && issue.workspaceName
              ? `${issue.workspaceName} / ${issue.team.key}`
              : issue.team.key}
          </span>
        ) : null}

        {displayProperties.has('assignee') ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/40 text-[9px] text-muted-foreground"
                aria-label={
                  issue.assignee?.displayName ??
                  translate('auto.components.TaskPage.42a9160321', 'Unassigned')
                }
              >
                {issue.assignee?.avatarUrl ? (
                  <img
                    src={issue.assignee.avatarUrl}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : issue.assignee ? (
                  issue.assignee.displayName.slice(0, 1).toUpperCase()
                ) : (
                  <span
                    className="size-2.5 rounded-full border border-dashed border-muted-foreground/60"
                    aria-hidden
                  />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {issue.assignee?.displayName ??
                translate('auto.components.TaskPage.42a9160321', 'Unassigned')}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {displayProperties.has('updated') ? (
          <span className="hidden w-12 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
            {formatShortDate(issue.updatedAt)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
