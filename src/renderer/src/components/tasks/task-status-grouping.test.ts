import { describe, expect, it } from 'vitest'
import {
  compareLinearWorkflowStates,
  getGitHubStatusGroup,
  getGitLabStatusGroup,
  getJiraStatusGroup,
  getStatusCategoryOrder
} from './task-status-grouping'

describe('getStatusCategoryOrder', () => {
  it('orders categories active-work-first like Linear', () => {
    const order = ['triage', 'started', 'unstarted', 'backlog', 'completed', 'canceled'].map(
      getStatusCategoryOrder
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(getStatusCategoryOrder('unknown')).toBeGreaterThan(getStatusCategoryOrder('canceled'))
  })
})

describe('compareLinearWorkflowStates', () => {
  it('places In Review above In Progress (position desc inside started)', () => {
    const inProgress = { type: 'started', position: 2 }
    const inReview = { type: 'started', position: 3 }
    expect(compareLinearWorkflowStates(inReview, inProgress)).toBeLessThan(0)
  })

  it('orders non-started types by position ascending and category first', () => {
    const todo = { type: 'unstarted', position: 1 }
    const backlog = { type: 'backlog', position: 0 }
    const done = { type: 'completed', position: 0 }
    expect(compareLinearWorkflowStates(todo, backlog)).toBeLessThan(0)
    expect(compareLinearWorkflowStates(backlog, done)).toBeLessThan(0)
  })
})

describe('provider status groups', () => {
  it('maps GitHub states onto Linear-like categories', () => {
    expect(getGitHubStatusGroup('open').category).toBe('unstarted')
    expect(getGitHubStatusGroup('draft').category).toBe('started')
    expect(getGitHubStatusGroup('merged').category).toBe('completed')
    expect(getGitHubStatusGroup('closed').category).toBe('canceled')
  })

  it('maps GitLab states including opened and locked', () => {
    expect(getGitLabStatusGroup('opened').key).toBe('open')
    expect(getGitLabStatusGroup('locked').category).toBe('canceled')
  })

  it('maps Jira status categories and keeps the human status name', () => {
    expect(getJiraStatusGroup('done', 'Готово')).toEqual({
      key: 'jira:Готово',
      label: 'Готово',
      category: 'completed'
    })
    expect(getJiraStatusGroup('indeterminate').category).toBe('started')
    expect(getJiraStatusGroup('new').category).toBe('unstarted')
  })
})
