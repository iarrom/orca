/** [FORK] Tasks in-page sidebar persisted state (Linear-parity Tasks page).
 *  Normalizes PersistedUIState.taskSidebarState on hydration so corrupt or
 *  stale persisted writes can't break the sidebar. */
import type { TaskSidebarFavorite, TaskSidebarState } from '../../../../shared/types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeFavorite(value: unknown): TaskSidebarFavorite | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const input = value as Record<string, unknown>
  switch (input.kind) {
    case 'saved-view':
      return isNonEmptyString(input.savedViewId)
        ? { kind: 'saved-view', savedViewId: input.savedViewId }
        : undefined
    case 'project':
      if (
        isNonEmptyString(input.projectId) &&
        isNonEmptyString(input.workspaceId) &&
        input.workspaceId !== 'all'
      ) {
        return {
          kind: 'project',
          projectId: input.projectId,
          workspaceId: input.workspaceId,
          name: isNonEmptyString(input.name) ? input.name : undefined
        }
      }
      return undefined
    case 'remote-view':
      if (
        isNonEmptyString(input.viewId) &&
        isNonEmptyString(input.workspaceId) &&
        input.workspaceId !== 'all' &&
        (input.model === 'issue' || input.model === 'project')
      ) {
        return {
          kind: 'remote-view',
          viewId: input.viewId,
          model: input.model,
          workspaceId: input.workspaceId,
          name: isNonEmptyString(input.name) ? input.name : undefined
        }
      }
      return undefined
    case 'team':
      return isNonEmptyString(input.teamId)
        ? {
            kind: 'team',
            teamId: input.teamId,
            name: isNonEmptyString(input.name) ? input.name : undefined
          }
        : undefined
    default:
      return undefined
  }
}

export function taskSidebarFavoriteKey(favorite: TaskSidebarFavorite): string {
  switch (favorite.kind) {
    case 'saved-view':
      return `saved-view:${favorite.savedViewId}`
    case 'project':
      return `project:${favorite.workspaceId}:${favorite.projectId}`
    case 'remote-view':
      return `remote-view:${favorite.workspaceId}:${favorite.model}:${favorite.viewId}`
    case 'team':
      return `team:${favorite.teamId}`
  }
}

export function normalizeTaskSidebarState(value: unknown): TaskSidebarState {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const input = value as Record<string, unknown>
  const state: TaskSidebarState = {}
  if (typeof input.collapsed === 'boolean') {
    state.collapsed = input.collapsed
  }
  if (Array.isArray(input.collapsedSections)) {
    const sections = input.collapsedSections.filter(isNonEmptyString)
    if (sections.length > 0) {
      state.collapsedSections = sections
    }
  }
  if (Array.isArray(input.favorites)) {
    const favorites: TaskSidebarFavorite[] = []
    const seen = new Set<string>()
    for (const item of input.favorites) {
      const favorite = sanitizeFavorite(item)
      if (!favorite) {
        continue
      }
      const key = taskSidebarFavoriteKey(favorite)
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      favorites.push(favorite)
    }
    if (favorites.length > 0) {
      state.favorites = favorites
    }
  }
  if (Array.isArray(input.collapsedTaskGroups)) {
    const groups = input.collapsedTaskGroups.filter(isNonEmptyString)
    if (groups.length > 0) {
      state.collapsedTaskGroups = groups
    }
  }
  return state
}

export function toggleTaskSidebarFavorite(
  favorites: TaskSidebarFavorite[] | undefined,
  favorite: TaskSidebarFavorite
): TaskSidebarFavorite[] {
  const key = taskSidebarFavoriteKey(favorite)
  const existing = favorites ?? []
  return existing.some((item) => taskSidebarFavoriteKey(item) === key)
    ? existing.filter((item) => taskSidebarFavoriteKey(item) !== key)
    : [...existing, favorite]
}

/** Collapsed-group keys are scoped `<navKey>::<groupKey>` so folding Done in
 *  one view doesn't fold it everywhere. */
export function taskGroupCollapseKey(navKey: string, groupKey: string): string {
  return `${navKey}::${groupKey}`
}

export function toggleCollapsedTaskGroup(
  collapsed: string[] | undefined,
  navKey: string,
  groupKey: string
): string[] {
  const key = taskGroupCollapseKey(navKey, groupKey)
  const existing = collapsed ?? []
  return existing.includes(key) ? existing.filter((item) => item !== key) : [...existing, key]
}

export function getCollapsedTaskGroupKeys(
  collapsed: string[] | undefined,
  navKey: string
): Set<string> {
  const prefix = `${navKey}::`
  return new Set(
    (collapsed ?? []).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length))
  )
}
