/** [FORK] Status-category group band for non-Linear providers (Linear-parity
 *  Tasks page). Gives GitHub/GitLab/Jira lists the same grouped visual system
 *  as the Linear list without touching their row internals. */
import React from 'react'

import type { ProviderStatusGroup } from './task-status-grouping'
import { LinearStateIcon } from './LinearStateIcon'

/** Category → Linear-style glyph type + neutral tone. Provider groups carry
 *  no API color, so the glyph uses the muted foreground token. */
const CATEGORY_GLYPH: Record<string, string> = {
  triage: 'triage',
  started: 'started',
  unstarted: 'unstarted',
  backlog: 'backlog',
  completed: 'completed',
  canceled: 'canceled'
}

export function ProviderStatusGroupHeader({
  group,
  count
}: {
  group: ProviderStatusGroup
  count: number
}): React.JSX.Element {
  return (
    <div className="flex h-9 items-center gap-2 bg-muted/40 pl-4 pr-3">
      <LinearStateIcon
        type={CATEGORY_GLYPH[group.category] ?? 'unstarted'}
        color="var(--muted-foreground)"
        className="size-3.5 shrink-0"
      />
      <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
        {group.label}
      </span>
      <span className="shrink-0 text-[12px] text-muted-foreground">{count}</span>
    </div>
  )
}
