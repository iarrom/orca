import { describe, expect, it } from 'vitest'
import type { TaskSavedView } from '../../../../shared/types'
import {
  createTaskSavedView,
  deleteTaskSavedView,
  getTaskSavedView,
  normalizeTaskSavedViewConfig,
  normalizeTaskSavedViews,
  renameTaskSavedView,
  setTaskSavedViewFavorite,
  taskSavedViewConfigsEqual,
  updateTaskSavedViewConfig,
  upsertTaskSavedView
} from './task-saved-views'
import { countActiveTaskViewFilters, normalizeTaskViewFilters } from './task-view-filters'

const NOW = 1_750_000_000_000

function makeView(id: string, overrides: Partial<TaskSavedView> = {}): TaskSavedView {
  return {
    id,
    name: `View ${id}`,
    provider: 'linear',
    config: { groupBy: 'status' },
    favorite: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

describe('normalizeTaskSavedViews', () => {
  it('drops corrupt entries, duplicate ids, and normalizes configs', () => {
    const views = normalizeTaskSavedViews([
      makeView('a'),
      makeView('a'),
      { id: '', name: 'broken', provider: 'linear', config: {} },
      { id: 'b', name: 'ok', provider: 'nope', config: {} },
      {
        id: 'c',
        name: 'partial',
        provider: 'github',
        config: { groupBy: 'bogus', orderBy: 'updated', displayProperties: ['state', 3] }
      },
      null,
      'string'
    ])
    expect(views.map((v) => v.id)).toEqual(['a', 'c'])
    expect(views[1].config).toEqual({ orderBy: 'updated', displayProperties: ['state'] })
  })
})

describe('CRUD helpers', () => {
  it('creates, upserts, renames, favorites, and deletes', () => {
    const created = createTaskSavedView({
      name: '  Today & Tomorrow  ',
      provider: 'linear',
      config: { groupBy: 'status', filters: { priorities: [1, 2] } },
      now: NOW
    })
    expect(created.name).toBe('Today & Tomorrow')
    expect(created.id).toBeTruthy()

    let views = upsertTaskSavedView([], created)
    expect(views).toHaveLength(1)

    views = renameTaskSavedView(views, created.id, 'Renamed', NOW + 1)
    expect(getTaskSavedView(views, created.id)?.name).toBe('Renamed')
    expect(getTaskSavedView(views, created.id)?.updatedAt).toBe(NOW + 1)

    views = renameTaskSavedView(views, created.id, '   ', NOW + 2)
    expect(getTaskSavedView(views, created.id)?.name).toBe('Renamed')

    views = setTaskSavedViewFavorite(views, created.id, true, NOW + 3)
    expect(getTaskSavedView(views, created.id)?.favorite).toBe(true)

    views = updateTaskSavedViewConfig(views, created.id, { groupBy: 'assignee' }, NOW + 4)
    expect(getTaskSavedView(views, created.id)?.config).toEqual({ groupBy: 'assignee' })

    views = deleteTaskSavedView(views, created.id)
    expect(views).toHaveLength(0)
  })
})

describe('normalizeTaskViewFilters', () => {
  it('keeps only valid entries and returns undefined when empty', () => {
    expect(normalizeTaskViewFilters(undefined)).toBeUndefined()
    expect(normalizeTaskViewFilters({})).toBeUndefined()
    expect(normalizeTaskViewFilters({ labels: [] })).toBeUndefined()
    expect(
      normalizeTaskViewFilters({
        stateTypes: ['started', ''],
        priorities: [1, 'x'],
        dueDate: 'overdue'
      })
    ).toEqual({ stateTypes: ['started'], priorities: [1], dueDate: 'overdue' })
  })

  it('counts active filter dimensions', () => {
    expect(countActiveTaskViewFilters(undefined)).toBe(0)
    expect(
      countActiveTaskViewFilters({
        stateTypes: ['started'],
        stateNames: ['In Review'],
        labels: ['bug'],
        dueDate: 'week'
      })
    ).toBe(3)
  })
})

describe('taskSavedViewConfigsEqual', () => {
  it('treats defaults, ordering, and whitespace as equal', () => {
    expect(taskSavedViewConfigsEqual(undefined, {})).toBe(true)
    expect(taskSavedViewConfigsEqual({ groupBy: 'status' }, {})).toBe(true)
    expect(
      taskSavedViewConfigsEqual(
        { displayProperties: ['a', 'b'], search: 'x ' },
        { displayProperties: ['b', 'a'], search: 'x' }
      )
    ).toBe(true)
    expect(
      taskSavedViewConfigsEqual(
        { filters: { labels: ['bug', 'ui'] } },
        { filters: { labels: ['ui', 'bug'] } }
      )
    ).toBe(true)
  })

  it('detects real differences', () => {
    expect(taskSavedViewConfigsEqual({ groupBy: 'assignee' }, {})).toBe(false)
    expect(taskSavedViewConfigsEqual({ filters: { labels: ['bug'] } }, {})).toBe(false)
    expect(taskSavedViewConfigsEqual({ showEmptyGroups: true }, {})).toBe(false)
  })
})

describe('normalizeTaskSavedViewConfig', () => {
  it('drops unknown enum values and blank search', () => {
    expect(
      normalizeTaskSavedViewConfig({
        search: '   ',
        groupBy: 'cycle',
        orderBy: 'dueDate',
        viewMode: 'board',
        showEmptyGroups: 'yes'
      })
    ).toEqual({ groupBy: 'cycle', orderBy: 'dueDate', viewMode: 'board' })
  })
})
