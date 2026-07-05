import { describe, expect, it } from 'vitest'
import type { LinearIssue, LinearWorkflowState } from '../../../../shared/types'
import {
  applyTaskViewFilters,
  compareLinearIssues,
  flattenLinearSections,
  groupLinearIssues
} from './linear-issue-list-model'

const NOW = new Date('2026-07-05T12:00:00.000Z').getTime()

function makeIssue(id: string, overrides: Partial<LinearIssue> = {}): LinearIssue {
  return {
    id,
    identifier: `DEV-${id}`,
    title: `Issue ${id}`,
    url: `https://linear.app/acme/issue/DEV-${id}`,
    state: { name: 'Todo', type: 'unstarted', color: '#888888' },
    team: { id: 'team-1', name: 'Dev', key: 'DEV' },
    labels: [],
    labelIds: [],
    priority: 0,
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides
  }
}

describe('compareLinearIssues', () => {
  it('orders by dueDate ascending with no-date last', () => {
    const early = makeIssue('1', { dueDate: '2026-07-02' })
    const late = makeIssue('2', { dueDate: '2026-07-20' })
    const none = makeIssue('3')
    const sorted = [none, late, early].sort((a, b) => compareLinearIssues(a, b, 'dueDate'))
    expect(sorted.map((i) => i.id)).toEqual(['1', '2', '3'])
  })

  it('orders by created descending with missing createdAt last', () => {
    const older = makeIssue('1', { createdAt: '2026-06-01T00:00:00.000Z' })
    const newer = makeIssue('2', { createdAt: '2026-07-01T00:00:00.000Z' })
    const missing = makeIssue('3')
    const sorted = [older, missing, newer].sort((a, b) => compareLinearIssues(a, b, 'created'))
    expect(sorted.map((i) => i.id)).toEqual(['2', '1', '3'])
  })

  it('ranks priority Urgent→Low with none last', () => {
    const urgent = makeIssue('1', { priority: 1 })
    const low = makeIssue('2', { priority: 4 })
    const none = makeIssue('3', { priority: 0 })
    const sorted = [none, low, urgent].sort((a, b) => compareLinearIssues(a, b, 'priority'))
    expect(sorted.map((i) => i.id)).toEqual(['1', '2', '3'])
  })
})

describe('applyTaskViewFilters', () => {
  const issues = [
    makeIssue('1', {
      state: { name: 'In Review', type: 'started', color: '#0f0' },
      assignee: { id: 'u1', displayName: 'Ada' },
      labels: ['bug'],
      priority: 1,
      project: { id: 'p1', name: 'Site' },
      dueDate: '2026-07-04'
    }),
    makeIssue('2', {
      state: { name: 'Todo', type: 'unstarted', color: '#888' },
      labels: ['feature'],
      priority: 3
    })
  ]

  it('returns all issues without filters', () => {
    expect(applyTaskViewFilters(issues, undefined, NOW)).toHaveLength(2)
  })

  it('filters by state type, assignee, label, priority, project', () => {
    expect(applyTaskViewFilters(issues, { stateTypes: ['started'] }, NOW).map((i) => i.id)).toEqual(
      ['1']
    )
    expect(
      applyTaskViewFilters(issues, { assigneeIds: ['unassigned'] }, NOW).map((i) => i.id)
    ).toEqual(['2'])
    expect(applyTaskViewFilters(issues, { labels: ['bug'] }, NOW).map((i) => i.id)).toEqual(['1'])
    expect(applyTaskViewFilters(issues, { priorities: [3] }, NOW).map((i) => i.id)).toEqual(['2'])
    expect(applyTaskViewFilters(issues, { projectIds: ['none'] }, NOW).map((i) => i.id)).toEqual([
      '2'
    ])
  })

  it('filters by due date buckets', () => {
    expect(applyTaskViewFilters(issues, { dueDate: 'overdue' }, NOW).map((i) => i.id)).toEqual([
      '1'
    ])
    expect(applyTaskViewFilters(issues, { dueDate: 'nodate' }, NOW).map((i) => i.id)).toEqual(['2'])
  })

  it('ANDs across dimensions', () => {
    expect(
      applyTaskViewFilters(issues, { stateTypes: ['started'], labels: ['feature'] }, NOW)
    ).toHaveLength(0)
  })
})

describe('groupLinearIssues', () => {
  const done = makeIssue('1', { state: { name: 'Done', type: 'completed', color: '#00f' } })
  const inProgress = makeIssue('2', {
    state: { name: 'In Progress', type: 'started', color: '#ff0' }
  })
  const inReview = makeIssue('3', { state: { name: 'In Review', type: 'started', color: '#0f0' } })
  const todo = makeIssue('4', { state: { name: 'Todo', type: 'unstarted', color: '#888' } })

  it('orders status groups canonically using workflow states', () => {
    const states: LinearWorkflowState[] = [
      { id: 's1', name: 'Todo', type: 'unstarted', color: '#888', position: 1 },
      { id: 's2', name: 'In Progress', type: 'started', color: '#ff0', position: 2 },
      { id: 's3', name: 'In Review', type: 'started', color: '#0f0', position: 3 },
      { id: 's4', name: 'Done', type: 'completed', color: '#00f', position: 4 }
    ]
    const sections = groupLinearIssues([done, inProgress, todo, inReview], 'status', 'priority', {
      states
    })
    expect(sections.map((s) => s.label)).toEqual(['In Review', 'In Progress', 'Todo', 'Done'])
    expect(sections[0].state?.color).toBe('#0f0')
  })

  it('falls back to category order without workflow states', () => {
    const sections = groupLinearIssues([done, todo, inReview], 'status', 'priority')
    expect(sections.map((s) => s.label)).toEqual(['In Review', 'Todo', 'Done'])
  })

  it('groups by project with No project last', () => {
    const withProject = makeIssue('5', { project: { id: 'p1', name: 'Site' } })
    const sections = groupLinearIssues([todo, withProject], 'project', 'priority')
    expect(sections.map((s) => s.key)).toEqual(['project:p1', 'project:none'])
  })

  it('groups by cycle newest-number-first with No cycle last', () => {
    const c68 = makeIssue('6', { cycle: { id: 'c68', number: 68 } })
    const c69 = makeIssue('7', { cycle: { id: 'c69', number: 69 } })
    const sections = groupLinearIssues([c68, todo, c69], 'cycle', 'priority')
    expect(sections.map((s) => s.key)).toEqual(['cycle:c69', 'cycle:c68', 'cycle:none'])
  })

  it('places Unassigned last for assignee grouping', () => {
    const assigned = makeIssue('8', { assignee: { id: 'u1', displayName: 'Ada' } })
    const sections = groupLinearIssues([todo, assigned], 'assignee', 'priority')
    expect(sections.map((s) => s.key)).toEqual(['assignee:u1', 'assignee:unassigned'])
  })
})

describe('flattenLinearSections', () => {
  it('emits section headers followed by issues, skipping collapsed sections', () => {
    const sections = groupLinearIssues(
      [
        makeIssue('1', { state: { name: 'Todo', type: 'unstarted', color: '#888' } }),
        makeIssue('2', { state: { name: 'Done', type: 'completed', color: '#00f' } })
      ],
      'status',
      'priority'
    )
    const rows = flattenLinearSections(sections)
    expect(rows.map((r) => r.type)).toEqual(['section', 'issue', 'section', 'issue'])

    const collapsed = flattenLinearSections(sections, new Set(['status:Todo']))
    expect(collapsed.map((r) => r.type)).toEqual(['section', 'section', 'issue'])
  })
})
