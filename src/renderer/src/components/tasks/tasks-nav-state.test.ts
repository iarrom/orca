import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TASKS_NAV,
  sanitizeTasksNavSelection,
  serializeTasksNavSelection,
  tasksNavSelectionsEqual
} from './tasks-nav-state'

describe('sanitizeTasksNavSelection', () => {
  it('accepts simple kinds', () => {
    expect(sanitizeTasksNavSelection({ kind: 'inbox' })).toEqual({ kind: 'inbox' })
    expect(sanitizeTasksNavSelection({ kind: 'my-issues' })).toEqual({ kind: 'my-issues' })
    expect(sanitizeTasksNavSelection({ kind: 'all-issues', teamId: 't1' })).toEqual({
      kind: 'all-issues',
      teamId: 't1'
    })
  })

  it('drops corrupt or incomplete selections', () => {
    expect(sanitizeTasksNavSelection(null)).toBeUndefined()
    expect(sanitizeTasksNavSelection({ kind: 'bogus' })).toBeUndefined()
    expect(sanitizeTasksNavSelection({ kind: 'project', projectId: 'p1' })).toBeUndefined()
    expect(
      sanitizeTasksNavSelection({ kind: 'project', projectId: 'p1', workspaceId: 'all' })
    ).toBeUndefined()
    expect(
      sanitizeTasksNavSelection({ kind: 'remote-view', viewId: 'v', workspaceId: 'w', model: 'x' })
    ).toBeUndefined()
    expect(sanitizeTasksNavSelection({ kind: 'saved-view', savedViewId: ' ' })).toBeUndefined()
  })

  it('accepts complete project/remote-view/saved-view selections', () => {
    expect(
      sanitizeTasksNavSelection({ kind: 'project', projectId: 'p1', workspaceId: 'w1' })
    ).toEqual({ kind: 'project', projectId: 'p1', workspaceId: 'w1' })
    expect(
      sanitizeTasksNavSelection({
        kind: 'remote-view',
        viewId: 'v1',
        model: 'issue',
        workspaceId: 'w1'
      })
    ).toEqual({ kind: 'remote-view', viewId: 'v1', model: 'issue', workspaceId: 'w1' })
    expect(sanitizeTasksNavSelection({ kind: 'saved-view', savedViewId: 'sv1' })).toEqual({
      kind: 'saved-view',
      savedViewId: 'sv1'
    })
  })
})

describe('serializeTasksNavSelection', () => {
  it('produces distinct stable keys', () => {
    const keys = [
      DEFAULT_TASKS_NAV,
      { kind: 'inbox' } as const,
      { kind: 'all-issues' } as const,
      { kind: 'all-issues', teamId: 't1' } as const,
      { kind: 'project', projectId: 'p1', workspaceId: 'w1' } as const,
      { kind: 'remote-view', viewId: 'v1', model: 'issue', workspaceId: 'w1' } as const,
      { kind: 'saved-view', savedViewId: 'sv1' } as const
    ].map(serializeTasksNavSelection)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('tasksNavSelectionsEqual', () => {
  it('compares by identity key', () => {
    expect(
      tasksNavSelectionsEqual(
        { kind: 'project', projectId: 'p1', workspaceId: 'w1' },
        { kind: 'project', projectId: 'p1', workspaceId: 'w1' }
      )
    ).toBe(true)
    expect(tasksNavSelectionsEqual({ kind: 'inbox' }, { kind: 'my-issues' })).toBe(false)
    expect(tasksNavSelectionsEqual(undefined, { kind: 'inbox' })).toBe(false)
    expect(tasksNavSelectionsEqual(undefined, undefined)).toBe(true)
  })
})
