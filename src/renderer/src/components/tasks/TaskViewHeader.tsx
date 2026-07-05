/** [FORK] View header row (Linear-parity Tasks page). Mirrors Linear's view
 *  chrome: back affordance for drilled-in contexts, view icon + name +
 *  favorite star + overflow menu on the left; issue count, Display popover,
 *  and view-details toggle on the right. */
import React from 'react'
import {
  ChevronLeft,
  EllipsisVertical,
  ExternalLink,
  LoaderCircle,
  PanelRight,
  Pencil,
  RefreshCw,
  Star,
  Trash2
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type TaskViewHeaderProps = {
  icon?: React.ReactNode
  title: string
  count?: number
  loading?: boolean
  favorite?: boolean
  canFavorite?: boolean
  onToggleFavorite?: () => void
  onBack?: () => void
  onRefresh?: () => void
  onRename?: () => void
  onDelete?: () => void
  onOpenExternal?: () => void
  detailsOpen?: boolean
  onToggleDetails?: () => void
  /** Right-side extras (e.g. the Display popover trigger). */
  children?: React.ReactNode
}

export function TaskViewHeader({
  icon,
  title,
  count,
  loading,
  favorite,
  canFavorite,
  onToggleFavorite,
  onBack,
  onRefresh,
  onRename,
  onDelete,
  onOpenExternal,
  detailsOpen,
  onToggleDetails,
  children
}: TaskViewHeaderProps): React.JSX.Element {
  const hasMenu = Boolean(onRename || onDelete || onOpenExternal)
  return (
    <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/60 px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onBack}
            aria-label={translate('auto.components.TaskPage.f397d513e3', 'Back')}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
        ) : null}
        {icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{title}</span>
        {canFavorite && onToggleFavorite ? (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={
              favorite
                ? translate('auto.components.tasks.details.unfavorite', 'Remove from favorites')
                : translate('auto.components.tasks.details.favorite', 'Add to favorites')
            }
            className={cn(
              'shrink-0 transition',
              favorite ? 'text-amber-400' : 'text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <Star className={cn('size-3.5', favorite && 'fill-current')} />
          </button>
        ) : null}
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={translate('auto.components.tasks.header.viewActions', 'View actions')}
              >
                <EllipsisVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {onRename ? (
                <DropdownMenuItem onSelect={onRename}>
                  <Pencil className="size-3.5" />
                  {translate('auto.components.tasks.header.rename', 'Rename view')}
                </DropdownMenuItem>
              ) : null}
              {onOpenExternal ? (
                <DropdownMenuItem onSelect={onOpenExternal}>
                  <ExternalLink className="size-3.5" />
                  {translate('auto.components.tasks.header.openInLinear', 'Open in Linear')}
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 className="size-3.5" />
                    {translate('auto.components.tasks.header.delete', 'Delete view')}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {count !== undefined ? (
          <span className="mr-1 text-[12px] text-muted-foreground">
            {translate('auto.components.tasks.header.issueCount', '{{count}} issues', { count })}
          </span>
        ) : null}
        {onRefresh ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRefresh}
                disabled={loading}
                aria-label={translate('auto.components.TaskPage.8964184a8b', 'Refresh Linear')}
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.TaskPage.8964184a8b', 'Refresh Linear')}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {children}
        {onToggleDetails ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleDetails}
                aria-pressed={detailsOpen}
                className={cn(detailsOpen && 'bg-accent text-accent-foreground')}
                aria-label={translate('auto.components.tasks.header.details', 'View details')}
              >
                <PanelRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.tasks.header.details', 'View details')}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
