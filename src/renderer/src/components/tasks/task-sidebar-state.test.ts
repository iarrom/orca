import { describe, expect, it } from 'vitest'
import {
  getCollapsedTaskGroupKeys,
  normalizeTaskSidebarState,
  taskGroupCollapseKey,
  toggleCollapsedTaskGroup,
  toggleTaskSidebarFavorite
} from './task-sidebar-state'

describe('normalizeTaskSidebarState', () => {
  it('returns empty state for corrupt input', () => {
    expect(normalizeTaskSidebarState(null)).toEqual({})
    expect(normalizeTaskSidebarState('x')).toEqual({})
  })

  it('keeps valid favorites, drops corrupt and duplicate ones', () => {
    const state = normalizeTaskSidebarState({
      collapsed: true,
      collapsedSections: ['workspace', ''],
      favorites: [
        { kind: 'saved-view', savedViewId: 'sv1' },
        { kind: 'saved-view', savedViewId: 'sv1' },
        { kind: 'project', projectId: 'p1', workspaceId: 'all' },
        { kind: 'project', projectId: 'p1', workspaceId: 'w1', name: 'Site' },
        { kind: 'remote-view', viewId: 'v1', model: 'issue', workspaceId: 'w1' },
        { kind: 'bogus' }
      ],
      collapsedTaskGroups: ['my-issues::status:Done']
    })
    expect(state.collapsed).toBe(true)
    expect(state.collapsedSections).toEqual(['workspace'])
    expect(state.favorites).toHaveLength(3)
    expect(state.collapsedTaskGroups).toEqual(['my-issues::status:Done'])
  })
})

describe('toggleTaskSidebarFavorite', () => {
  it('adds then removes by identity key', () => {
    const favorite = { kind: 'team', teamId: 't1' } as const
    const added = toggleTaskSidebarFavorite(undefined, favorite)
    expect(added).toHaveLength(1)
    expect(toggleTaskSidebarFavorite(added, { kind: 'team', teamId: 't1' })).toHaveLength(0)
  })
})

describe('collapsed task groups', () => {
  it('scopes group keys by nav key', () => {
    let collapsed = toggleCollapsedTaskGroup(undefined, 'my-issues', 'status:Done')
    collapsed = toggleCollapsedTaskGroup(collapsed, 'inbox', 'status:Done')
    expect(collapsed).toEqual([
      taskGroupCollapseKey('my-issues', 'status:Done'),
      taskGroupCollapseKey('inbox', 'status:Done')
    ])
    expect(getCollapsedTaskGroupKeys(collapsed, 'my-issues')).toEqual(new Set(['status:Done']))
    collapsed = toggleCollapsedTaskGroup(collapsed, 'my-issues', 'status:Done')
    expect(getCollapsedTaskGroupKeys(collapsed, 'my-issues').size).toBe(0)
  })
})
