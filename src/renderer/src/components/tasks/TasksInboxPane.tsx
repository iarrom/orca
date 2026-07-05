/** [FORK] Linear inbox pane (Linear-parity Tasks page). Notification rows —
 *  actor avatar, type summary, issue identifier + title, relative time,
 *  unread emphasis — with mark-all-read in the header. Clicking a row opens
 *  the issue and marks the notification read. */
import React from 'react'
import { CheckCheck, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LinearNotification } from '../../../../shared/types'

type TasksInboxPaneProps = {
  notifications: LinearNotification[]
  loading: boolean
  error: string | null
  onOpenNotification: (notification: LinearNotification) => void
  onMarkAllRead: () => void
  onRefresh: () => void
}

const NOTIFICATION_TYPE_LABELS: Record<string, () => string> = {
  issueAssignedToYou: () => translate('auto.components.tasks.inbox.assigned', 'Assigned to you'),
  issueMention: () => translate('auto.components.tasks.inbox.mention', 'Mentioned you'),
  issueCommentMention: () =>
    translate('auto.components.tasks.inbox.commentMention', 'Mentioned you in a comment'),
  issueNewComment: () => translate('auto.components.tasks.inbox.newComment', 'New comment'),
  issueStatusChanged: () =>
    translate('auto.components.tasks.inbox.statusChanged', 'Status changed'),
  issueEmojiReaction: () => translate('auto.components.tasks.inbox.reaction', 'Reaction'),
  issueBlocking: () => translate('auto.components.tasks.inbox.blocking', 'Blocking issue'),
  issueDue: () => translate('auto.components.tasks.inbox.due', 'Due soon')
}

function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type]?.() ?? type
}

function formatRelative(value: string): string {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) {
    return ''
  }
  const diffMs = Date.now() - time
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 60) {
    return translate('auto.components.tasks.inbox.minutesAgo', '{{count}}m', {
      count: Math.max(1, diffMinutes)
    })
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return translate('auto.components.tasks.inbox.hoursAgo', '{{count}}h', { count: diffHours })
  }
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TasksInboxPane({
  notifications,
  loading,
  error,
  onOpenNotification,
  onMarkAllRead,
  onRefresh
}: TasksInboxPaneProps): React.JSX.Element {
  const unreadCount = notifications.filter((n) => !n.readAt).length
  return (
    <div className="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden">
      <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/60 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Inbox className="size-4 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">
            {translate('auto.components.tasks.nav.inbox', 'Inbox')}
          </span>
          {unreadCount > 0 ? (
            <span className="text-[11px] text-muted-foreground">{unreadCount}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRefresh}
                disabled={loading}
                aria-label={translate('auto.components.TaskPage.8964184a8b', 'Refresh Linear')}
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.TaskPage.8964184a8b', 'Refresh Linear')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                aria-label={translate(
                  'auto.components.tasks.inbox.markAllRead',
                  'Mark all as read'
                )}
              >
                <CheckCheck className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {translate('auto.components.tasks.inbox.markAllRead', 'Mark all as read')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        {error ? (
          <div className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}
        {loading && notifications.length === 0 ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted/70" />
                <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : null}
        {!loading && notifications.length === 0 && !error ? (
          <div className="px-4 py-14 text-center">
            <Inbox className="mx-auto mb-3 size-7 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {translate('auto.components.tasks.inbox.emptyTitle', 'Inbox zero')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate(
                'auto.components.tasks.inbox.emptyBody',
                'New issue notifications from Linear will appear here.'
              )}
            </p>
          </div>
        ) : null}
        <div className="divide-y divide-border/40">
          {notifications.map((notification) => {
            const unread = !notification.readAt
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => onOpenNotification(notification)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-accent',
                  !unread && 'opacity-60'
                )}
              >
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/40 text-[10px] text-muted-foreground">
                  {notification.actor?.avatarUrl ? (
                    <img
                      src={notification.actor.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    (notification.actor?.displayName ?? '?').slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'min-w-0 truncate text-[13px]',
                        unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      )}
                    >
                      {notification.issue?.title ?? notificationTypeLabel(notification.type)}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {unread ? (
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelative(notification.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    {notification.issue ? (
                      <span className="shrink-0">{notification.issue.identifier}</span>
                    ) : null}
                    <span className="min-w-0 truncate">
                      {notificationTypeLabel(notification.type)}
                      {notification.actor?.displayName
                        ? ` · ${notification.actor.displayName}`
                        : ''}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
