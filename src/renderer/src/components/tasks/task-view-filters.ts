/** [FORK] TaskViewFilters normalization + counting (Linear-parity Tasks
 *  page). Split from task-saved-views.ts; applying filters to rows lives in
 *  linear-issue-list-model.ts. */
import type { TaskViewDueDateFilter, TaskViewFilters } from '../../../../shared/types'

const VALID_DUE_DATE_FILTERS = new Set<TaskViewDueDateFilter>([
  'overdue',
  'week',
  'month',
  'nodate'
])

export function normalizeFilterStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
  return items.length > 0 ? items : undefined
}

function normalizeFilterNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const items = value.filter(
    (item): item is number => typeof item === 'number' && Number.isFinite(item)
  )
  return items.length > 0 ? items : undefined
}

export function normalizeTaskViewFilters(value: unknown): TaskViewFilters | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const input = value as Record<string, unknown>
  const filters: TaskViewFilters = {}
  const stateTypes = normalizeFilterStringArray(input.stateTypes)
  if (stateTypes) {
    filters.stateTypes = stateTypes
  }
  const stateNames = normalizeFilterStringArray(input.stateNames)
  if (stateNames) {
    filters.stateNames = stateNames
  }
  const assigneeIds = normalizeFilterStringArray(input.assigneeIds)
  if (assigneeIds) {
    filters.assigneeIds = assigneeIds
  }
  const labels = normalizeFilterStringArray(input.labels)
  if (labels) {
    filters.labels = labels
  }
  const priorities = normalizeFilterNumberArray(input.priorities)
  if (priorities) {
    filters.priorities = priorities
  }
  const projectIds = normalizeFilterStringArray(input.projectIds)
  if (projectIds) {
    filters.projectIds = projectIds
  }
  const teamIds = normalizeFilterStringArray(input.teamIds)
  if (teamIds) {
    filters.teamIds = teamIds
  }
  if (VALID_DUE_DATE_FILTERS.has(input.dueDate as TaskViewDueDateFilter)) {
    filters.dueDate = input.dueDate as TaskViewDueDateFilter
  }
  return Object.keys(filters).length > 0 ? filters : undefined
}

export function hasActiveTaskViewFilters(filters: TaskViewFilters | undefined): boolean {
  return countActiveTaskViewFilters(filters) > 0
}

export function countActiveTaskViewFilters(filters: TaskViewFilters | undefined): number {
  if (!filters) {
    return 0
  }
  let count = 0
  if (filters.stateTypes?.length || filters.stateNames?.length) {
    count += 1
  }
  if (filters.assigneeIds?.length) {
    count += 1
  }
  if (filters.labels?.length) {
    count += 1
  }
  if (filters.priorities?.length) {
    count += 1
  }
  if (filters.projectIds?.length) {
    count += 1
  }
  if (filters.teamIds?.length) {
    count += 1
  }
  if (filters.dueDate) {
    count += 1
  }
  return count
}
