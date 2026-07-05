/** [FORK] Tasks sidebar navigation state (Linear-parity Tasks page).
 *  Pure helpers: persisted-value sanitization, stable serialization for
 *  scoping collapsed groups, and selection equality. */
import type { TasksNavSelection } from '../../../../shared/types'

export const DEFAULT_TASKS_NAV: TasksNavSelection = { kind: 'my-issues' }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isConcreteWorkspaceId(value: unknown): value is string {
  return isNonEmptyString(value) && value !== 'all'
}

export function sanitizeTasksNavSelection(value: unknown): TasksNavSelection | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const input = value as Record<string, unknown>
  switch (input.kind) {
    case 'inbox':
      return { kind: 'inbox' }
    case 'my-issues':
      return { kind: 'my-issues' }
    case 'all-issues':
      return isNonEmptyString(input.teamId)
        ? { kind: 'all-issues', teamId: input.teamId }
        : { kind: 'all-issues' }
    case 'projects-index':
      return isNonEmptyString(input.teamId)
        ? { kind: 'projects-index', teamId: input.teamId }
        : { kind: 'projects-index' }
    case 'views-index':
      return isNonEmptyString(input.teamId)
        ? { kind: 'views-index', teamId: input.teamId }
        : { kind: 'views-index' }
    case 'project':
      if (isNonEmptyString(input.projectId) && isConcreteWorkspaceId(input.workspaceId)) {
        return { kind: 'project', projectId: input.projectId, workspaceId: input.workspaceId }
      }
      return undefined
    case 'remote-view':
      if (
        isNonEmptyString(input.viewId) &&
        isConcreteWorkspaceId(input.workspaceId) &&
        (input.model === 'issue' || input.model === 'project')
      ) {
        return {
          kind: 'remote-view',
          viewId: input.viewId,
          model: input.model,
          workspaceId: input.workspaceId
        }
      }
      return undefined
    case 'saved-view':
      return isNonEmptyString(input.savedViewId)
        ? { kind: 'saved-view', savedViewId: input.savedViewId }
        : undefined
    default:
      return undefined
  }
}

/** Stable key for a nav selection — used to scope persisted collapsed task
 *  groups and to compare selections without deep-equality. */
export function serializeTasksNavSelection(nav: TasksNavSelection): string {
  switch (nav.kind) {
    case 'inbox':
      return 'inbox'
    case 'my-issues':
      return 'my-issues'
    case 'all-issues':
      return nav.teamId ? `all-issues:${nav.teamId}` : 'all-issues'
    case 'projects-index':
      return nav.teamId ? `projects-index:${nav.teamId}` : 'projects-index'
    case 'views-index':
      return nav.teamId ? `views-index:${nav.teamId}` : 'views-index'
    case 'project':
      return `project:${nav.workspaceId}:${nav.projectId}`
    case 'remote-view':
      return `remote-view:${nav.workspaceId}:${nav.model}:${nav.viewId}`
    case 'saved-view':
      return `saved-view:${nav.savedViewId}`
  }
}

export function tasksNavSelectionsEqual(
  a: TasksNavSelection | undefined,
  b: TasksNavSelection | undefined
): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return serializeTasksNavSelection(a) === serializeTasksNavSelection(b)
}
