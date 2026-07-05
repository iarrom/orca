/** [FORK] Linear issue list view-model (Linear-parity Tasks page).
 *  Pure filtering, ordering, and grouping over fetched LinearIssue rows.
 *  Extracted from TaskPage.tsx and extended with TaskViewFilters, the
 *  project/cycle group-bys, and created/dueDate order-bys. */
import { translate } from '@/i18n/i18n'
import type {
  LinearIssue,
  LinearWorkflowState,
  TaskViewFilters,
  TaskViewGroupBy,
  TaskViewOrderBy
} from '../../../../shared/types'
import { getLinearPriorityLabel } from '@/components/task-page-localized-options'
import { compareLinearWorkflowStates, getStatusCategoryOrder } from './task-status-grouping'

export type LinearGroupSection = {
  key: string
  label: string
  issues: LinearIssue[]
  /** Present for status groups — drives the state icon/color on the header. */
  state?: LinearIssue['state'] | null
  /** Present for priority groups. */
  priority?: number
}

export type LinearIssueListRow =
  | { type: 'section'; key: string; label: string; count: number; section: LinearGroupSection }
  | { type: 'issue'; issue: LinearIssue; sectionKey: string }

const DAY_MS = 24 * 60 * 60 * 1000

/** Linear ranks Urgent(1) → Low(4) with "No priority"(0) last. */
export function getLinearPriorityRank(priority: number): number {
  return priority === 0 ? 5 : priority
}

function dueDateTime(issue: LinearIssue): number {
  return issue.dueDate ? new Date(issue.dueDate).getTime() : Number.POSITIVE_INFINITY
}

function createdTime(issue: LinearIssue): number {
  return issue.createdAt ? new Date(issue.createdAt).getTime() : 0
}

export function compareLinearIssues(
  a: LinearIssue,
  b: LinearIssue,
  orderBy: TaskViewOrderBy
): number {
  if (orderBy === 'updated') {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  }
  if (orderBy === 'created') {
    return createdTime(b) - createdTime(a)
  }
  if (orderBy === 'dueDate') {
    const delta = dueDateTime(a) - dueDateTime(b)
    if (delta !== 0) {
      return delta
    }
    return getLinearPriorityRank(a.priority) - getLinearPriorityRank(b.priority)
  }
  if (orderBy === 'identifier') {
    return a.identifier.localeCompare(b.identifier, undefined, { numeric: true })
  }

  const priorityDelta = getLinearPriorityRank(a.priority) - getLinearPriorityRank(b.priority)
  if (priorityDelta !== 0) {
    return priorityDelta
  }
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

export function applyTaskViewFilters(
  issues: LinearIssue[],
  filters: TaskViewFilters | undefined,
  now = Date.now()
): LinearIssue[] {
  if (!filters) {
    return issues
  }
  return issues.filter((issue) => {
    if (filters.stateTypes?.length && !filters.stateTypes.includes(issue.state.type)) {
      return false
    }
    if (filters.stateNames?.length && !filters.stateNames.includes(issue.state.name)) {
      return false
    }
    if (filters.assigneeIds?.length) {
      const assigneeKey = issue.assignee?.id ?? 'unassigned'
      if (!filters.assigneeIds.includes(assigneeKey)) {
        return false
      }
    }
    if (filters.labels?.length && !issue.labels.some((label) => filters.labels!.includes(label))) {
      return false
    }
    if (filters.priorities?.length && !filters.priorities.includes(issue.priority)) {
      return false
    }
    if (filters.projectIds?.length) {
      const projectKey = issue.project?.id ?? 'none'
      if (!filters.projectIds.includes(projectKey)) {
        return false
      }
    }
    if (filters.teamIds?.length && !filters.teamIds.includes(issue.team.id)) {
      return false
    }
    if (filters.dueDate) {
      const due = issue.dueDate ? new Date(issue.dueDate).getTime() : null
      switch (filters.dueDate) {
        case 'nodate':
          if (due !== null) {
            return false
          }
          break
        case 'overdue':
          if (due === null || due >= now) {
            return false
          }
          break
        case 'week':
          if (due === null || due < now - DAY_MS || due > now + 7 * DAY_MS) {
            return false
          }
          break
        case 'month':
          if (due === null || due < now - DAY_MS || due > now + 30 * DAY_MS) {
            return false
          }
          break
      }
    }
    return true
  })
}

function getLinearIssueGroup(
  issue: LinearIssue,
  groupBy: TaskViewGroupBy
): { key: string; label: string } {
  if (groupBy === 'status') {
    return { key: `status:${issue.state.name}`, label: issue.state.name }
  }
  if (groupBy === 'assignee') {
    return {
      key: `assignee:${issue.assignee?.id ?? 'unassigned'}`,
      label:
        issue.assignee?.displayName ??
        translate('auto.components.tasks.group.unassigned', 'Unassigned')
    }
  }
  if (groupBy === 'priority') {
    return {
      key: `priority:${issue.priority}`,
      label: getLinearPriorityLabel(issue.priority)
    }
  }
  if (groupBy === 'team') {
    return { key: `team:${issue.team.id}`, label: issue.team.name }
  }
  if (groupBy === 'project') {
    return issue.project
      ? { key: `project:${issue.project.id}`, label: issue.project.name }
      : {
          key: 'project:none',
          label: translate('auto.components.tasks.group.noProject', 'No project')
        }
  }
  if (groupBy === 'cycle') {
    return issue.cycle
      ? {
          key: `cycle:${issue.cycle.id}`,
          label:
            issue.cycle.name ??
            (issue.cycle.number !== undefined
              ? translate('auto.components.tasks.group.cycleNumber', 'Cycle {{number}}', {
                  number: issue.cycle.number
                })
              : translate('auto.components.tasks.group.cycle', 'Cycle'))
        }
      : { key: 'cycle:none', label: translate('auto.components.tasks.group.noCycle', 'No cycle') }
  }
  return { key: 'all', label: translate('auto.components.TaskPage.dfc0c79bd8', 'Issues') }
}

function compareSections(
  a: LinearGroupSection,
  b: LinearGroupSection,
  groupBy: TaskViewGroupBy,
  states: LinearWorkflowState[] | undefined
): number {
  if (groupBy === 'status') {
    const stateA = a.state
    const stateB = b.state
    if (stateA && stateB) {
      const workflowA = states?.find((s) => s.name === stateA.name && s.type === stateA.type)
      const workflowB = states?.find((s) => s.name === stateB.name && s.type === stateB.type)
      if (workflowA && workflowB) {
        return compareLinearWorkflowStates(workflowA, workflowB)
      }
      const categoryDelta =
        getStatusCategoryOrder(stateA.type) - getStatusCategoryOrder(stateB.type)
      if (categoryDelta !== 0) {
        return categoryDelta
      }
    }
    return a.label.localeCompare(b.label)
  }
  if (groupBy === 'priority') {
    return getLinearPriorityRank(a.priority ?? 0) - getLinearPriorityRank(b.priority ?? 0)
  }
  if (groupBy === 'assignee') {
    if (a.key === 'assignee:unassigned') {
      return 1
    }
    if (b.key === 'assignee:unassigned') {
      return -1
    }
    return a.label.localeCompare(b.label)
  }
  if (groupBy === 'project') {
    if (a.key === 'project:none') {
      return 1
    }
    if (b.key === 'project:none') {
      return -1
    }
    return a.label.localeCompare(b.label)
  }
  if (groupBy === 'cycle') {
    if (a.key === 'cycle:none') {
      return 1
    }
    if (b.key === 'cycle:none') {
      return -1
    }
    const numberA = a.issues[0]?.cycle?.number
    const numberB = b.issues[0]?.cycle?.number
    if (typeof numberA === 'number' && typeof numberB === 'number' && numberA !== numberB) {
      // Why: newer cycles carry higher numbers and are what users work in.
      return numberB - numberA
    }
    return a.label.localeCompare(b.label)
  }
  return a.label.localeCompare(b.label)
}

export function groupLinearIssues(
  issues: LinearIssue[],
  groupBy: TaskViewGroupBy,
  orderBy: TaskViewOrderBy,
  options?: { states?: LinearWorkflowState[] }
): LinearGroupSection[] {
  const sorted = [...issues].sort((a, b) => compareLinearIssues(a, b, orderBy))
  if (groupBy === 'none') {
    return [
      {
        key: 'all',
        label: translate('auto.components.TaskPage.dfc0c79bd8', 'Issues'),
        issues: sorted
      }
    ]
  }

  const sections = new Map<string, LinearGroupSection>()
  for (const issue of sorted) {
    const group = getLinearIssueGroup(issue, groupBy)
    const section = sections.get(group.key)
    if (section) {
      section.issues.push(issue)
    } else {
      sections.set(group.key, {
        key: group.key,
        label: group.label,
        issues: [issue],
        ...(groupBy === 'status' ? { state: issue.state } : {}),
        ...(groupBy === 'priority' ? { priority: issue.priority } : {})
      })
    }
  }
  return [...sections.values()].sort((a, b) => compareSections(a, b, groupBy, options?.states))
}

export function flattenLinearSections(
  sections: LinearGroupSection[],
  collapsedKeys?: ReadonlySet<string>
): LinearIssueListRow[] {
  const rows: LinearIssueListRow[] = []
  for (const section of sections) {
    rows.push({
      type: 'section',
      key: section.key,
      label: section.label,
      count: section.issues.length,
      section
    })
    if (!collapsedKeys?.has(section.key)) {
      for (const issue of section.issues) {
        rows.push({ type: 'issue', issue, sectionKey: section.key })
      }
    }
  }
  return rows
}
