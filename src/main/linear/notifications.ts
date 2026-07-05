/** [FORK] Linear inbox notifications for the Linear-parity Tasks page.
 *  Read path mirrors issues.ts (raw GraphQL through the SDK client so the
 *  response is plain serializable data); writes use notificationUpdate /
 *  notificationMarkReadAll. Only issue-scoped notifications are returned —
 *  project/initiative/document notifications are filtered at this boundary. */
import type {
  LinearCollectionResult,
  LinearNotification,
  LinearWorkspaceError,
  LinearWorkspaceSelection
} from '../../shared/types'
import { acquire, release, getClients, isAuthError, clearToken } from './client'
import type { LinearClientForWorkspace } from './client'

const NOTIFICATIONS_PAGE_SIZE_MAX = 50
export const LINEAR_NOTIFICATIONS_DEFAULT_LIMIT = 50

type LinearNotificationNode = {
  id: string
  type?: string | null
  createdAt: string
  readAt?: string | null
  snoozedUntilAt?: string | null
  actor?: {
    id: string
    displayName?: string | null
    avatarUrl?: string | null
  } | null
  issue?: {
    id: string
    identifier: string
    title: string
    url?: string | null
    team?: { key?: string | null } | null
  } | null
}

type LinearNotificationsResponse = {
  notifications?: {
    nodes?: LinearNotificationNode[]
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
  }
}

const NOTIFICATIONS_QUERY = `
  query OrcaLinearNotifications($first: Int, $after: String) {
    notifications(first: $first, after: $after) {
      nodes {
        id
        type
        createdAt
        readAt
        snoozedUntilAt
        actor {
          id
          displayName
          avatarUrl
        }
        ... on IssueNotification {
          issue {
            id
            identifier
            title
            url
            team {
              key
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const NOTIFICATION_MARK_READ_MUTATION = `
  mutation OrcaLinearNotificationMarkRead($id: String!, $input: NotificationUpdateInput!) {
    notificationUpdate(id: $id, input: $input) {
      success
    }
  }
`

const NOTIFICATION_MARK_ALL_READ_MUTATION = `
  mutation OrcaLinearNotificationMarkAllRead($input: NotificationEntityInput!, $readAt: DateTime!) {
    notificationMarkReadAll(input: $input, readAt: $readAt) {
      success
    }
  }
`

function mapNotificationNode(
  entry: LinearClientForWorkspace,
  node: LinearNotificationNode
): LinearNotification {
  return {
    id: node.id,
    workspaceId: entry.workspace.id,
    workspaceName: entry.workspace.organizationName,
    type: node.type ?? '',
    createdAt: node.createdAt,
    readAt: node.readAt ?? null,
    snoozedUntilAt: node.snoozedUntilAt ?? null,
    actor: node.actor
      ? {
          id: node.actor.id,
          displayName: node.actor.displayName ?? '',
          avatarUrl: node.actor.avatarUrl ?? undefined
        }
      : undefined,
    issue: node.issue
      ? {
          id: node.issue.id,
          identifier: node.issue.identifier,
          title: node.issue.title,
          url: node.issue.url ?? undefined,
          teamKey: node.issue.team?.key ?? undefined
        }
      : undefined
  }
}

async function fetchNotificationsForWorkspace(
  entry: LinearClientForWorkspace,
  limit: number
): Promise<LinearNotification[]> {
  const items: LinearNotification[] = []
  let after: string | undefined
  // Why: paginate like the issue lists — Linear caps connection pages, and an
  // inbox holding mostly non-issue notifications must not come back short.
  while (items.length < limit) {
    const first = Math.min(NOTIFICATIONS_PAGE_SIZE_MAX, limit - items.length)
    const result = await entry.client.client.rawRequest<
      LinearNotificationsResponse,
      Record<string, unknown>
    >(NOTIFICATIONS_QUERY, after ? { first, after } : { first })
    const connection = result.data?.notifications
    const nodes = connection?.nodes ?? []
    items.push(
      ...nodes.filter((node) => node.issue).map((node) => mapNotificationNode(entry, node))
    )
    if (!connection?.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) {
      break
    }
    after = connection.pageInfo.endCursor
  }
  return items.slice(0, limit)
}

export async function listNotifications(
  limit?: number,
  workspaceId?: LinearWorkspaceSelection | null
): Promise<LinearCollectionResult<LinearNotification>> {
  const entries = getClients(workspaceId)
  if (entries.length === 0) {
    return { items: [] }
  }
  const effectiveLimit = Math.max(1, limit ?? LINEAR_NOTIFICATIONS_DEFAULT_LIMIT)

  const results = await Promise.all(
    entries.map(
      async (
        entry
      ): Promise<{ items: LinearNotification[]; error: LinearWorkspaceError | null }> => {
        await acquire()
        try {
          return { items: await fetchNotificationsForWorkspace(entry, effectiveLimit), error: null }
        } catch (error) {
          if (isAuthError(error)) {
            clearToken(entry.workspace.id)
            if (workspaceId !== 'all') {
              throw error
            }
          }
          return {
            items: [],
            error: {
              workspaceId: entry.workspace.id,
              workspaceName: entry.workspace.organizationName,
              type: isAuthError(error) ? 'auth' : 'unknown',
              message: error instanceof Error ? error.message : String(error)
            }
          }
        } finally {
          release()
        }
      }
    )
  )

  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, effectiveLimit)
  const errors = results.flatMap((result) => (result.error ? [result.error] : []))
  return errors.length > 0 ? { items, errors } : { items }
}

export async function markNotificationRead(
  id: string,
  workspaceId?: string | null
): Promise<boolean> {
  const entry = getClients(workspaceId)[0]
  if (!entry) {
    throw new Error('Not connected to Linear')
  }

  await acquire()
  try {
    const result = await entry.client.client.rawRequest<
      { notificationUpdate?: { success?: boolean } },
      Record<string, unknown>
    >(NOTIFICATION_MARK_READ_MUTATION, {
      id,
      input: { readAt: new Date().toISOString() }
    })
    return result.data?.notificationUpdate?.success === true
  } catch (error) {
    if (isAuthError(error)) {
      clearToken(entry.workspace.id)
    }
    throw error
  } finally {
    release()
  }
}

export async function markAllNotificationsRead(
  workspaceId?: LinearWorkspaceSelection | null
): Promise<boolean> {
  const entries = getClients(workspaceId)
  if (entries.length === 0) {
    throw new Error('Not connected to Linear')
  }

  const results = await Promise.all(
    entries.map(async (entry) => {
      await acquire()
      try {
        const result = await entry.client.client.rawRequest<
          { notificationMarkReadAll?: { success?: boolean } },
          Record<string, unknown>
        >(NOTIFICATION_MARK_ALL_READ_MUTATION, {
          input: {},
          readAt: new Date().toISOString()
        })
        return result.data?.notificationMarkReadAll?.success === true
      } catch (error) {
        if (isAuthError(error)) {
          clearToken(entry.workspace.id)
          if (workspaceId !== 'all') {
            throw error
          }
        }
        console.warn('[linear] markAllNotificationsRead failed:', error)
        return false
      } finally {
        release()
      }
    })
  )
  return results.some(Boolean)
}
