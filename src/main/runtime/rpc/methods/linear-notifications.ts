/** [FORK] Linear inbox notification RPC methods (Linear-parity Tasks page).
 *  Split from linear.ts to keep that file under the max-lines budget. */
import { z } from 'zod'
import { defineMethod, type RpcMethod } from '../core'
import { OptionalFiniteNumber, OptionalString, requiredString } from '../schemas'

const WorkspaceSelection = z
  .object({
    workspaceId: OptionalString
  })
  .optional()

export const LINEAR_NOTIFICATION_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'linear.notifications',
    params: z
      .object({
        limit: OptionalFiniteNumber,
        workspaceId: OptionalString
      })
      .optional(),
    handler: async (params, { runtime }) =>
      runtime.linearNotifications(params?.limit, params?.workspaceId)
  }),
  defineMethod({
    name: 'linear.notificationMarkRead',
    params: z.object({
      id: requiredString('Notification ID is required'),
      workspaceId: OptionalString
    }),
    handler: async (params, { runtime }) =>
      runtime.linearNotificationMarkRead(params.id.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'linear.notificationMarkAllRead',
    params: WorkspaceSelection,
    handler: async (params, { runtime }) =>
      runtime.linearNotificationMarkAllRead(params?.workspaceId)
  })
]
