/** [FORK] Right view-details panel (Linear-parity Tasks page). Shows the
 *  active view's name, description, visibility, owner, and facet tabs with
 *  per-value counts computed client-side from the loaded issue list. */
import React, { useMemo, useState } from 'react'
import { Star, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import type { LinearIssue } from '../../../../shared/types'

type FacetTab = 'assignees' | 'labels' | 'projects' | 'teams'

type TaskViewDetailsPanelProps = {
  title: string
  description?: string
  visibilityLabel: string
  ownerLabel?: string
  favorite: boolean
  canFavorite: boolean
  onToggleFavorite: () => void
  issues: LinearIssue[]
  onClose: () => void
}

function countBy(
  issues: LinearIssue[],
  key: (issue: LinearIssue) => string | null
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    const value = key(issue)
    if (value === null) {
      continue
    }
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]))
}

export function TaskViewDetailsPanel({
  title,
  description,
  visibilityLabel,
  ownerLabel,
  favorite,
  canFavorite,
  onToggleFavorite,
  issues,
  onClose
}: TaskViewDetailsPanelProps): React.JSX.Element {
  const [tab, setTab] = useState<FacetTab>('assignees')

  const facetCounts = useMemo(() => {
    switch (tab) {
      case 'assignees':
        return countBy(issues, (issue) =>
          issue.assignee
            ? issue.assignee.displayName
            : translate('auto.components.TaskPage.42a9160321', 'Unassigned')
        )
      case 'labels':
        return countBy(issues, (issue) => issue.labels[0] ?? null)
      case 'projects':
        return countBy(issues, (issue) => issue.project?.name ?? null)
      case 'teams':
        return countBy(issues, (issue) => issue.team.name)
    }
  }, [issues, tab])

  const tabs: { id: FacetTab; label: string }[] = [
    {
      id: 'assignees',
      label: translate('auto.components.tasks.details.assignees', 'Assignees')
    },
    { id: 'labels', label: translate('auto.components.TaskPage.d0ca4aa1d0', 'Labels') },
    { id: 'projects', label: translate('auto.components.TaskPage.727069bee5', 'Projects') },
    { id: 'teams', label: translate('auto.components.tasks.details.teams', 'Teams') }
  ]

  return (
    <div className="flex h-full w-[280px] flex-none flex-col border-l border-border/60 bg-background">
      <div className="flex flex-none items-start justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[14px] font-semibold text-foreground">
              {title}
            </span>
            {canFavorite ? (
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
                  favorite
                    ? 'text-amber-400'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}
              >
                <Star className={cn('size-3.5', favorite && 'fill-current')} />
              </button>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 line-clamp-3 text-[12px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label={translate('auto.components.tasks.details.close', 'Close view details')}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex-none space-y-1.5 border-b border-border/60 px-4 pb-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">
            {translate('auto.components.TaskPage.a04fe7ba73', 'Visibility')}
          </span>
          <span className="text-foreground">{visibilityLabel}</span>
        </div>
        {ownerLabel ? (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">
              {translate('auto.components.TaskPage.b4e10f096e', 'Owner')}
            </span>
            <span className="text-foreground">{ownerLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-none items-center gap-1 px-3 pt-2">
        {tabs.map((facetTab) => (
          <button
            key={facetTab.id}
            type="button"
            aria-pressed={tab === facetTab.id}
            onClick={() => setTab(facetTab.id)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] transition',
              tab === facetTab.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {facetTab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek px-4 py-2">
        {facetCounts.size === 0 ? (
          <p className="py-4 text-center text-[12px] text-muted-foreground">
            {translate('auto.components.tasks.details.noValues', 'Nothing to show yet')}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {[...facetCounts.entries()].map(([label, count]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[12px]"
              >
                <span className="min-w-0 truncate text-foreground">{label}</span>
                <span className="shrink-0 text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
