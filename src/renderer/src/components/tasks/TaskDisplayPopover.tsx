/** [FORK] Linear-style Display options popover (Linear-parity Tasks page).
 *  View mode toggle, Grouping/Ordering selects, empty-group toggle, and
 *  displayed-property chips — mirroring Linear's Display panel. */
import React from 'react'
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getLinearDisplayProperties,
  getLinearGroupOptions,
  getLinearOrderOptions,
  type LinearDisplayProperty,
  type LinearGroupBy,
  type LinearOrderBy,
  type LinearViewMode
} from '@/components/task-page-localized-options'

type TaskDisplayPopoverProps = {
  viewMode: LinearViewMode
  groupBy: LinearGroupBy
  orderBy: LinearOrderBy
  displayProperties: ReadonlySet<LinearDisplayProperty>
  showEmptyGroups: boolean
  onViewModeChange: (mode: LinearViewMode) => void
  onGroupByChange: (groupBy: LinearGroupBy) => void
  onOrderByChange: (orderBy: LinearOrderBy) => void
  onToggleDisplayProperty: (property: LinearDisplayProperty) => void
  onShowEmptyGroupsChange: (show: boolean) => void
}

export function TaskDisplayPopover({
  viewMode,
  groupBy,
  orderBy,
  displayProperties,
  showEmptyGroups,
  onViewModeChange,
  onGroupByChange,
  onOrderByChange,
  onToggleDisplayProperty,
  onShowEmptyGroupsChange
}: TaskDisplayPopoverProps): React.JSX.Element {
  const groupOptions = getLinearGroupOptions()
  const orderOptions = getLinearOrderOptions()
  const propertyOptions = getLinearDisplayProperties()

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={translate('auto.components.tasks.display.title', 'Display options')}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          {translate('auto.components.tasks.display.title', 'Display options')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="border-b border-border p-3">
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-muted/30 p-0.5">
            {(
              [
                {
                  id: 'list' as const,
                  label: translate('auto.components.TaskPage.a6f7e93d7f', 'List'),
                  Icon: List
                },
                {
                  id: 'board' as const,
                  label: translate('auto.components.TaskPage.d747aed72f', 'Board'),
                  Icon: LayoutGrid
                }
              ] satisfies { id: LinearViewMode; label: string; Icon: typeof List }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={viewMode === id}
                onClick={() => onViewModeChange(id)}
                className={cn(
                  'flex h-9 flex-col items-center justify-center gap-0.5 rounded text-[11px] text-muted-foreground transition hover:text-foreground',
                  viewMode === id && 'bg-background text-foreground shadow-xs'
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2.5 border-b border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {translate('auto.components.TaskPage.5659da12fc', 'Grouping')}
            </span>
            <Select
              value={groupBy}
              onValueChange={(value) => onGroupByChange(value as LinearGroupBy)}
            >
              <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {translate('auto.components.TaskPage.5d2d835467', 'Ordering')}
            </span>
            <Select
              value={orderBy}
              onValueChange={(value) => onOrderByChange(value as LinearOrderBy)}
            >
              <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {groupBy !== 'none' ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {translate('auto.components.tasks.display.showEmptyGroups', 'Show empty groups')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showEmptyGroups}
                onClick={() => onShowEmptyGroupsChange(!showEmptyGroups)}
                className={cn(
                  'relative h-4.5 w-8 rounded-full border border-border/60 transition-colors',
                  showEmptyGroups ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-background shadow-xs transition-[left]',
                    showEmptyGroups ? 'left-[calc(100%-16px)]' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            {translate('auto.components.TaskPage.a26a48252e', 'Display properties')}
          </div>
          <div className="flex flex-wrap gap-1">
            {propertyOptions.map((property) => {
              const active = displayProperties.has(property.id)
              return (
                <button
                  key={property.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleDisplayProperty(property.id)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] transition',
                    active
                      ? 'border-border bg-accent text-accent-foreground'
                      : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {property.label}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
