/** [FORK] Orca-local saved task views (Linear-parity Tasks page).
 *  Pure CRUD + normalization over the persisted TaskSavedView[] array.
 *  Persistence rides PersistedUIState.taskSavedViews via ui:set. */
import type {
  TaskProvider,
  TaskSavedView,
  TaskSavedViewConfig,
  TaskSavedViewScope,
  TaskViewFilters,
  TaskViewGroupBy,
  TaskViewMode,
  TaskViewOrderBy
} from '../../../../shared/types'
import { normalizeFilterStringArray, normalizeTaskViewFilters } from './task-view-filters'

const VALID_PROVIDERS = new Set<TaskProvider>(['github', 'gitlab', 'linear', 'jira'])
const VALID_GROUP_BYS = new Set<TaskViewGroupBy>([
  'none',
  'status',
  'assignee',
  'priority',
  'team',
  'project',
  'cycle'
])
const VALID_ORDER_BYS = new Set<TaskViewOrderBy>([
  'priority',
  'updated',
  'created',
  'dueDate',
  'identifier'
])
const VALID_VIEW_MODES = new Set<TaskViewMode>(['list', 'board'])

export function generateTaskSavedViewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeTaskSavedViewConfig(value: unknown): TaskSavedViewConfig {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const input = value as Record<string, unknown>
  const config: TaskSavedViewConfig = {}
  if (typeof input.search === 'string' && input.search.trim()) {
    config.search = input.search
  }
  const filters = normalizeTaskViewFilters(input.filters)
  if (filters) {
    config.filters = filters
  }
  if (VALID_GROUP_BYS.has(input.groupBy as TaskViewGroupBy)) {
    config.groupBy = input.groupBy as TaskViewGroupBy
  }
  if (VALID_ORDER_BYS.has(input.orderBy as TaskViewOrderBy)) {
    config.orderBy = input.orderBy as TaskViewOrderBy
  }
  if (VALID_VIEW_MODES.has(input.viewMode as TaskViewMode)) {
    config.viewMode = input.viewMode as TaskViewMode
  }
  const displayProperties = normalizeFilterStringArray(input.displayProperties)
  if (displayProperties) {
    config.displayProperties = displayProperties
  }
  if (typeof input.showEmptyGroups === 'boolean') {
    config.showEmptyGroups = input.showEmptyGroups
  }
  if (typeof input.showSubIssues === 'boolean') {
    config.showSubIssues = input.showSubIssues
  }
  return config
}

function normalizeScope(value: unknown): TaskSavedViewScope | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const input = value as Record<string, unknown>
  const scope: TaskSavedViewScope = {}
  if (typeof input.workspaceId === 'string' && input.workspaceId.trim()) {
    scope.workspaceId = input.workspaceId
  }
  const teamIds = normalizeFilterStringArray(input.teamIds)
  if (teamIds) {
    scope.teamIds = teamIds
  }
  const repoIds = normalizeFilterStringArray(input.repoIds)
  if (repoIds) {
    scope.repoIds = repoIds
  }
  if (typeof input.siteId === 'string' && input.siteId.trim()) {
    scope.siteId = input.siteId
  }
  return Object.keys(scope).length > 0 ? scope : undefined
}

/** Drops corrupt entries so a bad persisted write can't break the sidebar. */
export function normalizeTaskSavedViews(value: unknown): TaskSavedView[] {
  if (!Array.isArray(value)) {
    return []
  }
  const views: TaskSavedView[] = []
  const seenIds = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const input = item as Record<string, unknown>
    if (
      typeof input.id !== 'string' ||
      !input.id.trim() ||
      seenIds.has(input.id) ||
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      !VALID_PROVIDERS.has(input.provider as TaskProvider)
    ) {
      continue
    }
    seenIds.add(input.id)
    views.push({
      id: input.id,
      name: input.name,
      provider: input.provider as TaskProvider,
      scope: normalizeScope(input.scope),
      config: normalizeTaskSavedViewConfig(input.config),
      favorite: input.favorite === true,
      createdAt: typeof input.createdAt === 'number' ? input.createdAt : 0,
      updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : 0
    })
  }
  return views
}

export function createTaskSavedView(input: {
  name: string
  provider: TaskProvider
  config: TaskSavedViewConfig
  scope?: TaskSavedViewScope
  now: number
  id?: string
}): TaskSavedView {
  return {
    id: input.id ?? generateTaskSavedViewId(),
    name: input.name.trim(),
    provider: input.provider,
    scope: input.scope,
    config: normalizeTaskSavedViewConfig(input.config),
    favorite: false,
    createdAt: input.now,
    updatedAt: input.now
  }
}

export function getTaskSavedView(
  views: TaskSavedView[],
  id: string | undefined
): TaskSavedView | undefined {
  return id ? views.find((view) => view.id === id) : undefined
}

export function upsertTaskSavedView(views: TaskSavedView[], view: TaskSavedView): TaskSavedView[] {
  const index = views.findIndex((existing) => existing.id === view.id)
  if (index === -1) {
    return [...views, view]
  }
  const next = [...views]
  next[index] = view
  return next
}

export function updateTaskSavedViewConfig(
  views: TaskSavedView[],
  id: string,
  config: TaskSavedViewConfig,
  now: number
): TaskSavedView[] {
  return views.map((view) =>
    view.id === id
      ? { ...view, config: normalizeTaskSavedViewConfig(config), updatedAt: now }
      : view
  )
}

export function renameTaskSavedView(
  views: TaskSavedView[],
  id: string,
  name: string,
  now: number
): TaskSavedView[] {
  const trimmed = name.trim()
  if (!trimmed) {
    return views
  }
  return views.map((view) => (view.id === id ? { ...view, name: trimmed, updatedAt: now } : view))
}

export function deleteTaskSavedView(views: TaskSavedView[], id: string): TaskSavedView[] {
  return views.filter((view) => view.id !== id)
}

export function setTaskSavedViewFavorite(
  views: TaskSavedView[],
  id: string,
  favorite: boolean,
  now: number
): TaskSavedView[] {
  return views.map((view) => (view.id === id ? { ...view, favorite, updatedAt: now } : view))
}

function sortedOrEmpty(values: readonly string[] | undefined): string[] {
  return values ? [...values].sort() : []
}

function stringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function taskViewFiltersEqual(
  a: TaskViewFilters | undefined,
  b: TaskViewFilters | undefined
): boolean {
  const left = a ?? {}
  const right = b ?? {}
  const numericLeft = [...(left.priorities ?? [])].sort()
  const numericRight = [...(right.priorities ?? [])].sort()
  return (
    stringArraysEqual(sortedOrEmpty(left.stateTypes), sortedOrEmpty(right.stateTypes)) &&
    stringArraysEqual(sortedOrEmpty(left.stateNames), sortedOrEmpty(right.stateNames)) &&
    stringArraysEqual(sortedOrEmpty(left.assigneeIds), sortedOrEmpty(right.assigneeIds)) &&
    stringArraysEqual(sortedOrEmpty(left.labels), sortedOrEmpty(right.labels)) &&
    numericLeft.length === numericRight.length &&
    numericLeft.every((value, index) => value === numericRight[index]) &&
    stringArraysEqual(sortedOrEmpty(left.projectIds), sortedOrEmpty(right.projectIds)) &&
    stringArraysEqual(sortedOrEmpty(left.teamIds), sortedOrEmpty(right.teamIds)) &&
    (left.dueDate ?? null) === (right.dueDate ?? null)
  )
}

/** Detects "view has unsaved changes" for the Save/Update affordance. Display
 *  properties compare as sets — order is a rendering concern, not identity. */
export function taskSavedViewConfigsEqual(
  a: TaskSavedViewConfig | undefined,
  b: TaskSavedViewConfig | undefined
): boolean {
  const left = a ?? {}
  const right = b ?? {}
  return (
    (left.search?.trim() || '') === (right.search?.trim() || '') &&
    taskViewFiltersEqual(left.filters, right.filters) &&
    (left.groupBy ?? 'status') === (right.groupBy ?? 'status') &&
    (left.orderBy ?? 'priority') === (right.orderBy ?? 'priority') &&
    (left.viewMode ?? 'list') === (right.viewMode ?? 'list') &&
    stringArraysEqual(
      sortedOrEmpty(left.displayProperties),
      sortedOrEmpty(right.displayProperties)
    ) &&
    (left.showEmptyGroups ?? false) === (right.showEmptyGroups ?? false) &&
    (left.showSubIssues ?? false) === (right.showSubIssues ?? false)
  )
}
