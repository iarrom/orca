/** [FORK] Cross-provider status→group mapping (Linear-parity Tasks page).
 *  Maps each provider's native status onto Linear-like status categories so
 *  GitHub/GitLab/Jira lists group under the same visual system as Linear.
 *  Group ordering follows Linear's canonical workflow order. */
import { translate } from '@/i18n/i18n'
import type { LinearWorkflowState } from '../../../../shared/types'

export type TaskStatusCategory =
  | 'triage'
  | 'started'
  | 'unstarted'
  | 'backlog'
  | 'completed'
  | 'canceled'

/** Linear's status-group order in list views: active work first, then queued,
 *  then finished. */
const CATEGORY_ORDER: Record<TaskStatusCategory, number> = {
  triage: 0,
  started: 1,
  unstarted: 2,
  backlog: 3,
  completed: 4,
  canceled: 5
}

export function getStatusCategoryOrder(category: string): number {
  return CATEGORY_ORDER[category as TaskStatusCategory] ?? 9
}

/** Orders two Linear workflow states the way Linear orders status groups:
 *  category first, then position — descending inside 'started' (In Review
 *  above In Progress), ascending elsewhere. */
export function compareLinearWorkflowStates(
  a: Pick<LinearWorkflowState, 'type' | 'position'>,
  b: Pick<LinearWorkflowState, 'type' | 'position'>
): number {
  const categoryDelta = getStatusCategoryOrder(a.type) - getStatusCategoryOrder(b.type)
  if (categoryDelta !== 0) {
    return categoryDelta
  }
  return a.type === 'started' ? b.position - a.position : a.position - b.position
}

export type ProviderStatusGroup = {
  key: string
  label: string
  category: TaskStatusCategory
}

/** GitHub work items: `open | draft | merged | closed`. */
export function getGitHubStatusGroup(state: string): ProviderStatusGroup {
  switch (state) {
    case 'draft':
      return {
        key: 'draft',
        label: translate('auto.components.tasks.status.draft', 'Draft'),
        category: 'started'
      }
    case 'merged':
      return {
        key: 'merged',
        label: translate('auto.components.tasks.status.merged', 'Merged'),
        category: 'completed'
      }
    case 'closed':
      return {
        key: 'closed',
        label: translate('auto.components.tasks.status.closed', 'Closed'),
        category: 'canceled'
      }
    default:
      return {
        key: 'open',
        label: translate('auto.components.tasks.status.open', 'Open'),
        category: 'unstarted'
      }
  }
}

/** GitLab work items keep the native `opened` plus draft/merged/closed/locked. */
export function getGitLabStatusGroup(state: string): ProviderStatusGroup {
  switch (state) {
    case 'draft':
      return {
        key: 'draft',
        label: translate('auto.components.tasks.status.draft', 'Draft'),
        category: 'started'
      }
    case 'merged':
      return {
        key: 'merged',
        label: translate('auto.components.tasks.status.merged', 'Merged'),
        category: 'completed'
      }
    case 'closed':
      return {
        key: 'closed',
        label: translate('auto.components.tasks.status.closed', 'Closed'),
        category: 'canceled'
      }
    case 'locked':
      return {
        key: 'locked',
        label: translate('auto.components.tasks.status.locked', 'Locked'),
        category: 'canceled'
      }
    default:
      return {
        key: 'open',
        label: translate('auto.components.tasks.status.open', 'Open'),
        category: 'unstarted'
      }
  }
}

/** Jira status categories: `new | indeterminate | done`. The human label from
 *  the issue's own status wins when present so custom workflows read right. */
export function getJiraStatusGroup(categoryKey: string, statusName?: string): ProviderStatusGroup {
  switch (categoryKey) {
    case 'done':
      return {
        key: `jira:${statusName ?? 'done'}`,
        label: statusName ?? translate('auto.components.tasks.status.done', 'Done'),
        category: 'completed'
      }
    case 'indeterminate':
      return {
        key: `jira:${statusName ?? 'in-progress'}`,
        label: statusName ?? translate('auto.components.tasks.status.inProgress', 'In Progress'),
        category: 'started'
      }
    default:
      return {
        key: `jira:${statusName ?? 'todo'}`,
        label: statusName ?? translate('auto.components.tasks.status.todo', 'To Do'),
        category: 'unstarted'
      }
  }
}
