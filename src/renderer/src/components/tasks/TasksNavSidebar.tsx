/** [FORK] In-page Tasks navigation sidebar (Linear-parity Tasks page).
 *  Mirrors Linear's left rail: source/workspace switcher on top, then Inbox,
 *  My Issues, Workspace (Projects/Views), Favorites, and Your teams. For
 *  non-Linear providers only the switcher band renders — their existing
 *  chrome stays in the main column. Uses the `sidebar` token family. */
import React from 'react'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Inbox,
  Layers,
  Plus,
  Star,
  UserRound,
  Users
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SourceOption } from '@/components/task-page-localized-options'
import type { TaskSourceAvailabilityNotice } from '@/components/task-source-context-summary'
import type {
  LinearCustomViewSummary,
  LinearTeam,
  TaskProvider,
  TaskSavedView,
  TaskSidebarFavorite,
  TasksNavSelection
} from '../../../../shared/types'
import { tasksNavSelectionsEqual } from './tasks-nav-state'
import { TasksSidebarRow, TasksSidebarSectionHeader } from './TasksSidebarRow'
import { taskSidebarFavoriteKey } from './task-sidebar-state'

export const TASKS_SIDEBAR_WIDTH = 244

type TasksNavSidebarProps = {
  sourceOptions: SourceOption[]
  taskSource: TaskProvider
  sourceNotices: Partial<Record<TaskProvider, TaskSourceAvailabilityNotice | null>>
  onSelectSource: (source: TaskProvider) => void
  nav: TasksNavSelection
  onSelectNav: (nav: TasksNavSelection) => void
  linearConnected: boolean
  teams: LinearTeam[]
  savedViews: TaskSavedView[]
  remoteViews: LinearCustomViewSummary[]
  favorites: TaskSidebarFavorite[]
  inboxUnreadCount: number
  collapsedSections: string[]
  onToggleSection: (sectionId: string) => void
  onNewIssue: () => void
  showWorkspaceNames: boolean
}

export function TasksNavSidebar({
  sourceOptions,
  taskSource,
  sourceNotices,
  onSelectSource,
  nav,
  onSelectNav,
  linearConnected,
  teams,
  savedViews,
  remoteViews,
  favorites,
  inboxUnreadCount,
  collapsedSections,
  onToggleSection,
  onNewIssue,
  showWorkspaceNames
}: TasksNavSidebarProps): React.JSX.Element {
  const isCollapsed = (sectionId: string): boolean => collapsedSections.includes(sectionId)
  const isActive = (candidate: TasksNavSelection): boolean =>
    tasksNavSelectionsEqual(nav, candidate)

  const favoriteRows = favorites
    .map((favorite) => {
      switch (favorite.kind) {
        case 'saved-view': {
          const view = savedViews.find((v) => v.id === favorite.savedViewId)
          if (!view) {
            return null
          }
          return {
            key: taskSidebarFavoriteKey(favorite),
            label: view.name,
            icon: <Layers className="size-3.5" />,
            nav: { kind: 'saved-view', savedViewId: view.id } satisfies TasksNavSelection
          }
        }
        case 'project':
          return {
            key: taskSidebarFavoriteKey(favorite),
            label: favorite.name ?? translate('auto.components.TaskPage.00022ec0ba', 'Project'),
            icon: <Box className="size-3.5" />,
            nav: {
              kind: 'project',
              projectId: favorite.projectId,
              workspaceId: favorite.workspaceId
            } satisfies TasksNavSelection
          }
        case 'remote-view':
          return {
            key: taskSidebarFavoriteKey(favorite),
            label: favorite.name ?? translate('auto.components.TaskPage.9c57663908', 'View'),
            icon: <Layers className="size-3.5" />,
            nav: {
              kind: 'remote-view',
              viewId: favorite.viewId,
              model: favorite.model,
              workspaceId: favorite.workspaceId
            } satisfies TasksNavSelection
          }
        case 'team': {
          const team = teams.find((t) => t.id === favorite.teamId)
          return {
            key: taskSidebarFavoriteKey(favorite),
            label: favorite.name ?? team?.name ?? favorite.teamId,
            icon: <Users className="size-3.5" />,
            nav: { kind: 'all-issues', teamId: favorite.teamId } satisfies TasksNavSelection
          }
        }
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return (
    <div
      className="flex h-full min-h-0 flex-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width: TASKS_SIDEBAR_WIDTH }}
      data-contextual-tour-target="tasks-source-filters"
    >
      {/* Source switcher band — the Linear workspace-switcher analog. */}
      <div className="flex flex-none items-center justify-between gap-1 px-3 pb-1 pt-2">
        <div className="flex min-w-0 items-center gap-1">
          {sourceOptions.map((source) => {
            const active = taskSource === source.id
            const notice = sourceNotices[source.id] ?? null
            const disabled = source.disabled || notice?.blocking
            return (
              <Tooltip key={source.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectSource(source.id)}
                    data-task-source={source.id}
                    aria-label={notice?.label ?? source.label}
                    aria-pressed={active}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md transition',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      disabled && 'cursor-not-allowed opacity-55'
                    )}
                  >
                    <source.Icon className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {notice?.label ?? source.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        {taskSource === 'linear' && linearConnected ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onNewIssue}
                aria-label={translate('auto.components.TaskPage.3feb524d42', 'New Linear issue')}
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.TaskPage.3feb524d42', 'New Linear issue')}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {taskSource === 'linear' && linearConnected ? (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek px-2 pb-3">
          <div className="flex flex-col gap-0.5 pt-1">
            <TasksSidebarRow
              active={isActive({ kind: 'inbox' })}
              icon={<Inbox className="size-3.5" />}
              label={translate('auto.components.tasks.nav.inbox', 'Inbox')}
              onClick={() => onSelectNav({ kind: 'inbox' })}
              trailing={
                inboxUnreadCount > 0 ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    aria-label={translate(
                      'auto.components.tasks.nav.unread',
                      '{{count}} unread notifications',
                      { count: inboxUnreadCount }
                    )}
                  />
                ) : undefined
              }
            />
            <TasksSidebarRow
              active={isActive({ kind: 'my-issues' })}
              icon={<UserRound className="size-3.5" />}
              label={translate('auto.components.tasks.nav.myIssues', 'My Issues')}
              onClick={() => onSelectNav({ kind: 'my-issues' })}
            />
          </div>

          <div className="mt-4">
            <TasksSidebarSectionHeader
              label={translate('auto.components.tasks.nav.workspace', 'Workspace')}
              collapsed={isCollapsed('workspace')}
              onToggle={() => onToggleSection('workspace')}
            />
            {!isCollapsed('workspace') ? (
              <div className="mt-0.5 flex flex-col gap-0.5">
                <TasksSidebarRow
                  active={isActive({ kind: 'projects-index' })}
                  icon={<Box className="size-3.5" />}
                  label={translate('auto.components.TaskPage.727069bee5', 'Projects')}
                  onClick={() => onSelectNav({ kind: 'projects-index' })}
                />
                <TasksSidebarRow
                  active={isActive({ kind: 'views-index' })}
                  icon={<Layers className="size-3.5" />}
                  label={translate('auto.components.TaskPage.e78ec261ed', 'Views')}
                  onClick={() => onSelectNav({ kind: 'views-index' })}
                />
              </div>
            ) : null}
          </div>

          {savedViews.length > 0 || remoteViews.length > 0 ? (
            <div className="mt-4">
              <TasksSidebarSectionHeader
                label={translate('auto.components.TaskPage.e78ec261ed', 'Views')}
                collapsed={isCollapsed('views')}
                onToggle={() => onToggleSection('views')}
              />
              {!isCollapsed('views') ? (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {savedViews.map((view) => (
                    <TasksSidebarRow
                      key={view.id}
                      active={isActive({ kind: 'saved-view', savedViewId: view.id })}
                      icon={<Layers className="size-3.5" />}
                      label={view.name}
                      onClick={() => onSelectNav({ kind: 'saved-view', savedViewId: view.id })}
                    />
                  ))}
                  {remoteViews.map((view) =>
                    view.workspaceId ? (
                      <TasksSidebarRow
                        key={`${view.workspaceId}:${view.id}`}
                        active={isActive({
                          kind: 'remote-view',
                          viewId: view.id,
                          model: view.model,
                          workspaceId: view.workspaceId
                        })}
                        icon={<Layers className="size-3.5" />}
                        label={
                          showWorkspaceNames && view.workspaceName
                            ? `${view.workspaceName} / ${view.name}`
                            : view.name
                        }
                        onClick={() =>
                          onSelectNav({
                            kind: 'remote-view',
                            viewId: view.id,
                            model: view.model,
                            workspaceId: view.workspaceId!
                          })
                        }
                      />
                    ) : null
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {favoriteRows.length > 0 ? (
            <div className="mt-4">
              <TasksSidebarSectionHeader
                label={translate('auto.components.tasks.nav.favorites', 'Favorites')}
                collapsed={isCollapsed('favorites')}
                onToggle={() => onToggleSection('favorites')}
              />
              {!isCollapsed('favorites') ? (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {favoriteRows.map((row) => (
                    <TasksSidebarRow
                      key={row.key}
                      active={isActive(row.nav)}
                      icon={
                        <span className="relative flex size-4 items-center justify-center">
                          {row.icon}
                          <Star className="absolute -bottom-0.5 -right-0.5 size-2 fill-current text-sidebar-foreground/50" />
                        </span>
                      }
                      label={row.label}
                      onClick={() => onSelectNav(row.nav)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {teams.length > 0 ? (
            <div className="mt-4">
              <TasksSidebarSectionHeader
                label={translate('auto.components.tasks.nav.yourTeams', 'Your teams')}
                collapsed={isCollapsed('teams')}
                onToggle={() => onToggleSection('teams')}
              />
              {!isCollapsed('teams') ? (
                <div className="mt-0.5 flex flex-col gap-1">
                  {teams.map((team) => {
                    const sectionId = `team:${team.id}`
                    const teamCollapsed = isCollapsed(sectionId)
                    return (
                      <div key={team.id}>
                        <button
                          type="button"
                          onClick={() => onToggleSection(sectionId)}
                          aria-expanded={!teamCollapsed}
                          className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium text-sidebar-foreground/90 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                          <Users className="size-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            {showWorkspaceNames && team.workspaceName
                              ? `${team.workspaceName} / ${team.name}`
                              : team.name}
                          </span>
                          {teamCollapsed ? (
                            <ChevronRight className="size-3 shrink-0 text-sidebar-foreground/50" />
                          ) : (
                            <ChevronDown className="size-3 shrink-0 text-sidebar-foreground/50" />
                          )}
                        </button>
                        {!teamCollapsed ? (
                          <div className="flex flex-col gap-0.5">
                            <TasksSidebarRow
                              indent
                              active={isActive({ kind: 'all-issues', teamId: team.id })}
                              label={translate('auto.components.TaskPage.dfc0c79bd8', 'Issues')}
                              onClick={() => onSelectNav({ kind: 'all-issues', teamId: team.id })}
                            />
                            <TasksSidebarRow
                              indent
                              active={isActive({ kind: 'projects-index', teamId: team.id })}
                              label={translate('auto.components.TaskPage.727069bee5', 'Projects')}
                              onClick={() =>
                                onSelectNav({ kind: 'projects-index', teamId: team.id })
                              }
                            />
                            <TasksSidebarRow
                              indent
                              active={isActive({ kind: 'views-index', teamId: team.id })}
                              label={translate('auto.components.TaskPage.e78ec261ed', 'Views')}
                              onClick={() => onSelectNav({ kind: 'views-index', teamId: team.id })}
                            />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 px-3 pt-2 text-[12px] text-sidebar-foreground/60">
          {sourceNotices[taskSource]?.label ??
            sourceOptions.find((option) => option.id === taskSource)?.label ??
            null}
        </div>
      )}
    </div>
  )
}
