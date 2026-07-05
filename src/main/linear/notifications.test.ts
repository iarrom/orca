import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LinearClientForWorkspace } from './client'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notifications'

const getClients = vi.fn()
const clearToken = vi.fn()
const isAuthError = vi.fn()

vi.mock('./client', () => ({
  acquire: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
  getClients: (...args: unknown[]) => getClients(...args),
  isAuthError: (...args: unknown[]) => isAuthError(...args),
  clearToken: (...args: unknown[]) => clearToken(...args)
}))

type RawPage = {
  nodes: unknown[]
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
}

function issueNotificationNode(id: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: 'issueAssignedToYou',
    createdAt,
    readAt: null,
    snoozedUntilAt: null,
    actor: { id: 'actor-1', displayName: 'Ada', avatarUrl: null },
    issue: {
      id: `issue-${id}`,
      identifier: `DEV-${id}`,
      title: `Issue ${id}`,
      url: `https://linear.app/acme/issue/DEV-${id}`,
      team: { key: 'DEV' }
    },
    ...extra
  }
}

function makeEntry(workspaceId: string, pages: RawPage[]): LinearClientForWorkspace {
  let call = 0
  return {
    workspace: {
      id: workspaceId,
      organizationId: workspaceId,
      organizationName: `${workspaceId}-org`,
      organizationUrlKey: workspaceId,
      displayName: 'Ada',
      email: 'ada@example.com'
    },
    client: {
      client: {
        rawRequest: vi.fn().mockImplementation(async () => {
          const page = pages[Math.min(call, pages.length - 1)]
          call += 1
          return { data: { notifications: page } }
        })
      }
    }
  } as unknown as LinearClientForWorkspace
}

beforeEach(() => {
  getClients.mockReset()
  clearToken.mockReset()
  isAuthError.mockReset().mockReturnValue(false)
})

describe('listNotifications', () => {
  it('returns issue notifications and drops non-issue ones', async () => {
    const entry = makeEntry('w1', [
      {
        nodes: [
          issueNotificationNode('1', '2026-07-01T00:00:00.000Z'),
          {
            id: 'project-notif',
            type: 'projectUpdateCreated',
            createdAt: '2026-07-02T00:00:00.000Z'
          }
        ],
        pageInfo: { hasNextPage: false }
      }
    ])
    getClients.mockReturnValue([entry])

    const result = await listNotifications()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: '1',
      workspaceId: 'w1',
      workspaceName: 'w1-org',
      type: 'issueAssignedToYou',
      issue: { identifier: 'DEV-1', teamKey: 'DEV' }
    })
    expect(result.errors).toBeUndefined()
  })

  it('walks pages until the limit is met even when issue notifications are sparse', async () => {
    const entry = makeEntry('w1', [
      {
        nodes: [{ id: 'other', type: 'projectUpdateCreated', createdAt: '2026-07-03T00:00:00Z' }],
        pageInfo: { hasNextPage: true, endCursor: 'c1' }
      },
      {
        nodes: [issueNotificationNode('2', '2026-07-02T00:00:00.000Z')],
        pageInfo: { hasNextPage: false }
      }
    ])
    getClients.mockReturnValue([entry])

    const result = await listNotifications(5)
    expect(result.items.map((n) => n.id)).toEqual(['2'])
  })

  it('merges workspaces newest-first and reports per-workspace errors', async () => {
    const ok = makeEntry('w1', [
      { nodes: [issueNotificationNode('1', '2026-07-01T00:00:00.000Z')] }
    ])
    const failing = makeEntry('w2', [])
    ;(
      failing.client.client as unknown as { rawRequest: ReturnType<typeof vi.fn> }
    ).rawRequest.mockRejectedValue(new Error('boom'))
    getClients.mockReturnValue([ok, failing])

    const result = await listNotifications(10, 'all')
    expect(result.items.map((n) => n.id)).toEqual(['1'])
    expect(result.errors).toEqual([
      expect.objectContaining({ workspaceId: 'w2', type: 'unknown', message: 'boom' })
    ])
  })

  it('clears the token and rethrows on auth errors for a concrete workspace', async () => {
    const failing = makeEntry('w1', [])
    ;(
      failing.client.client as unknown as { rawRequest: ReturnType<typeof vi.fn> }
    ).rawRequest.mockRejectedValue(new Error('unauthorized'))
    isAuthError.mockReturnValue(true)
    getClients.mockReturnValue([failing])

    await expect(listNotifications(10, 'w1')).rejects.toThrow('unauthorized')
    expect(clearToken).toHaveBeenCalledWith('w1')
  })
})

describe('markNotificationRead', () => {
  it('sends a notificationUpdate mutation with readAt', async () => {
    const entry = makeEntry('w1', [])
    const rawRequest = (
      entry.client.client as unknown as { rawRequest: ReturnType<typeof vi.fn> }
    ).rawRequest.mockResolvedValue({ data: { notificationUpdate: { success: true } } })
    getClients.mockReturnValue([entry])

    await expect(markNotificationRead('notif-1', 'w1')).resolves.toBe(true)
    const [, variables] = rawRequest.mock.calls[0]
    expect(variables.id).toBe('notif-1')
    expect(typeof (variables.input as { readAt: string }).readAt).toBe('string')
  })

  it('throws when not connected', async () => {
    getClients.mockReturnValue([])
    await expect(markNotificationRead('notif-1')).rejects.toThrow('Not connected to Linear')
  })
})

describe('markAllNotificationsRead', () => {
  it('marks all workspaces and reports success when any succeeds', async () => {
    const ok = makeEntry('w1', [])
    ;(
      ok.client.client as unknown as { rawRequest: ReturnType<typeof vi.fn> }
    ).rawRequest.mockResolvedValue({ data: { notificationMarkReadAll: { success: true } } })
    const failing = makeEntry('w2', [])
    ;(
      failing.client.client as unknown as { rawRequest: ReturnType<typeof vi.fn> }
    ).rawRequest.mockRejectedValue(new Error('boom'))
    getClients.mockReturnValue([ok, failing])

    await expect(markAllNotificationsRead('all')).resolves.toBe(true)
  })
})
