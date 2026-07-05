/** [FORK] Linear-style filter bar (Linear-parity Tasks page). A `Filter +`
 *  entry opens a Command picker over facet values derived from the loaded
 *  issues; active filters render as removable chips; a trailing Save/Update
 *  view affordance appears when the configuration diverges from the active
 *  saved view. */
import React, { useMemo, useState } from 'react'
import { Check, ListFilter, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { LinearPriorityIcon } from '@/components/linear-priority-icon'
import { getLinearPriorityLabel } from '@/components/task-page-localized-options'
import type { LinearIssue, TaskViewFilters } from '../../../../shared/types'
import { LinearStateIcon } from './LinearStateIcon'

type FilterChip = {
  key: string
  label: string
  onRemove: () => void
}

type TaskFilterBarProps = {
  filters: TaskViewFilters
  onFiltersChange: (filters: TaskViewFilters) => void
  /** Loaded issues — facet values are derived from what is actually shown. */
  issues: LinearIssue[]
  savedViewActive: boolean
  savedViewDirty: boolean
  onSaveView: () => void
  onUpdateView: () => void
  onResetView: () => void
}

function toggleValue(values: string[] | undefined, value: string): string[] | undefined {
  const list = values ?? []
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  return next.length > 0 ? next : undefined
}

function toggleNumber(values: number[] | undefined, value: number): number[] | undefined {
  const list = values ?? []
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  return next.length > 0 ? next : undefined
}

export function TaskFilterBar({
  filters,
  onFiltersChange,
  issues,
  savedViewActive,
  savedViewDirty,
  onSaveView,
  onUpdateView,
  onResetView
}: TaskFilterBarProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  const facets = useMemo(() => {
    const states = new Map<string, LinearIssue['state']>()
    const assignees = new Map<string, string>()
    const labels = new Set<string>()
    const priorities = new Set<number>()
    const projects = new Map<string, string>()
    for (const issue of issues) {
      states.set(issue.state.name, issue.state)
      if (issue.assignee) {
        assignees.set(issue.assignee.id, issue.assignee.displayName)
      }
      for (const label of issue.labels) {
        labels.add(label)
      }
      priorities.add(issue.priority)
      if (issue.project) {
        projects.set(issue.project.id, issue.project.name)
      }
    }
    return { states, assignees, labels, priorities, projects }
  }, [issues])

  const chips = useMemo<FilterChip[]>(() => {
    const result: FilterChip[] = []
    for (const name of filters.stateNames ?? []) {
      result.push({
        key: `state:${name}`,
        label: translate('auto.components.tasks.filters.statusIs', 'Status is {{value0}}', {
          value0: name
        }),
        onRemove: () =>
          onFiltersChange({ ...filters, stateNames: toggleValue(filters.stateNames, name) })
      })
    }
    for (const id of filters.assigneeIds ?? []) {
      const label =
        id === 'unassigned'
          ? translate('auto.components.TaskPage.42a9160321', 'Unassigned')
          : (facets.assignees.get(id) ?? id)
      result.push({
        key: `assignee:${id}`,
        label: translate('auto.components.tasks.filters.assigneeIs', 'Assignee is {{value0}}', {
          value0: label
        }),
        onRemove: () =>
          onFiltersChange({ ...filters, assigneeIds: toggleValue(filters.assigneeIds, id) })
      })
    }
    for (const label of filters.labels ?? []) {
      result.push({
        key: `label:${label}`,
        label: translate('auto.components.tasks.filters.labelIs', 'Label is {{value0}}', {
          value0: label
        }),
        onRemove: () => onFiltersChange({ ...filters, labels: toggleValue(filters.labels, label) })
      })
    }
    for (const priority of filters.priorities ?? []) {
      result.push({
        key: `priority:${priority}`,
        label: translate('auto.components.tasks.filters.priorityIs', 'Priority is {{value0}}', {
          value0: getLinearPriorityLabel(priority)
        }),
        onRemove: () =>
          onFiltersChange({ ...filters, priorities: toggleNumber(filters.priorities, priority) })
      })
    }
    for (const id of filters.projectIds ?? []) {
      const label =
        id === 'none'
          ? translate('auto.components.tasks.group.noProject', 'No project')
          : (facets.projects.get(id) ?? id)
      result.push({
        key: `project:${id}`,
        label: translate('auto.components.tasks.filters.projectIs', 'Project is {{value0}}', {
          value0: label
        }),
        onRemove: () =>
          onFiltersChange({ ...filters, projectIds: toggleValue(filters.projectIds, id) })
      })
    }
    return result
  }, [facets, filters, onFiltersChange])

  const hasChips = chips.length > 0

  return (
    <div
      className={cn(
        'flex min-h-9 flex-none flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-1.5',
        !hasChips && 'min-h-9'
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            className={cn('gap-1 text-[12px] text-muted-foreground hover:text-foreground')}
          >
            <ListFilter className="size-3.5" />
            {hasChips ? null : translate('auto.components.tasks.filters.filter', 'Filter')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-0">
          <Command>
            <CommandInput
              placeholder={translate('auto.components.tasks.filters.placeholder', 'Filter by...')}
            />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>
                {translate('auto.components.tasks.filters.empty', 'No matching filters')}
              </CommandEmpty>
              <CommandGroup heading={translate('auto.components.TaskPage.154b0fa623', 'Status')}>
                {[...facets.states.values()].map((state) => {
                  const active = (filters.stateNames ?? []).includes(state.name)
                  return (
                    <CommandItem
                      key={`state:${state.name}`}
                      value={`status ${state.name}`}
                      onSelect={() =>
                        onFiltersChange({
                          ...filters,
                          stateNames: toggleValue(filters.stateNames, state.name)
                        })
                      }
                    >
                      <LinearStateIcon type={state.type} color={state.color} className="size-3.5" />
                      {state.name}
                      {active ? <Check className="ml-auto size-3.5" /> : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandGroup heading={translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}>
                {[
                  ...[...facets.assignees.entries()].map(([id, name]) => ({ id, name })),
                  {
                    id: 'unassigned',
                    name: translate('auto.components.TaskPage.42a9160321', 'Unassigned')
                  }
                ].map(({ id, name }) => {
                  const active = (filters.assigneeIds ?? []).includes(id)
                  return (
                    <CommandItem
                      key={`assignee:${id}`}
                      value={`assignee ${name}`}
                      onSelect={() =>
                        onFiltersChange({
                          ...filters,
                          assigneeIds: toggleValue(filters.assigneeIds, id)
                        })
                      }
                    >
                      {name}
                      {active ? <Check className="ml-auto size-3.5" /> : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {facets.labels.size > 0 ? (
                <CommandGroup heading={translate('auto.components.TaskPage.d0ca4aa1d0', 'Labels')}>
                  {[...facets.labels].map((label) => {
                    const active = (filters.labels ?? []).includes(label)
                    return (
                      <CommandItem
                        key={`label:${label}`}
                        value={`label ${label}`}
                        onSelect={() =>
                          onFiltersChange({
                            ...filters,
                            labels: toggleValue(filters.labels, label)
                          })
                        }
                      >
                        {label}
                        {active ? <Check className="ml-auto size-3.5" /> : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
              <CommandGroup heading={translate('auto.components.TaskPage.c8d5bec5f7', 'Priority')}>
                {[...facets.priorities].sort().map((priority) => {
                  const active = (filters.priorities ?? []).includes(priority)
                  return (
                    <CommandItem
                      key={`priority:${priority}`}
                      value={`priority ${getLinearPriorityLabel(priority)}`}
                      onSelect={() =>
                        onFiltersChange({
                          ...filters,
                          priorities: toggleNumber(filters.priorities, priority)
                        })
                      }
                    >
                      <LinearPriorityIcon priority={priority} className="size-3.5" />
                      {getLinearPriorityLabel(priority)}
                      {active ? <Check className="ml-auto size-3.5" /> : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {facets.projects.size > 0 ? (
                <CommandGroup heading={translate('auto.components.TaskPage.00022ec0ba', 'Project')}>
                  {[...facets.projects.entries()].map(([id, name]) => {
                    const active = (filters.projectIds ?? []).includes(id)
                    return (
                      <CommandItem
                        key={`project:${id}`}
                        value={`project ${name}`}
                        onSelect={() =>
                          onFiltersChange({
                            ...filters,
                            projectIds: toggleValue(filters.projectIds, id)
                          })
                        }
                      >
                        {name}
                        {active ? <Check className="ml-auto size-3.5" /> : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={translate('auto.components.tasks.filters.remove', 'Remove filter')}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {hasChips || (savedViewActive && savedViewDirty) ? (
        <div className="ml-auto flex items-center gap-1.5">
          {savedViewActive && savedViewDirty ? (
            <Button variant="ghost" size="xs" className="text-[12px]" onClick={onResetView}>
              {translate('auto.components.tasks.filters.reset', 'Reset')}
            </Button>
          ) : null}
          {savedViewActive ? (
            savedViewDirty ? (
              <Button variant="outline" size="xs" className="text-[12px]" onClick={onUpdateView}>
                {translate('auto.components.tasks.filters.updateView', 'Update view')}
              </Button>
            ) : null
          ) : (
            <Button variant="outline" size="xs" className="text-[12px]" onClick={onSaveView}>
              {translate('auto.components.tasks.filters.saveView', 'Save view')}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
