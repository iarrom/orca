// [FORK] Контекстное меню строки агента (правый клик) — как в Cursor «1 в 1»,
// но без «Move to» (у нас нет статус-канбана для сессий) и без «Open in Web»
// (локальные агенты не имеют облачной веб-страницы). Пункты: Pin / Rename /
// Mark as Unread — разделитель — Archive.
import React from 'react'
import { Archive, Bell, BellDot, Pencil, Pin, PinOff } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { translate } from '@/i18n/i18n'

export function AgentRowContextMenu({
  isPinned,
  isUnread,
  onTogglePin,
  onRename,
  onToggleUnread,
  onArchive,
  children
}: {
  isPinned: boolean
  isUnread: boolean
  onTogglePin: () => void
  onRename: () => void
  onToggleUnread: () => void
  onArchive: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={onTogglePin}>
          {isPinned ? <PinOff /> : <Pin />}
          {isPinned
            ? translate('auto.components.sidebar.agentsView.unpin', 'Unpin')
            : translate('auto.components.sidebar.agentsView.pin', 'Pin')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onRename}>
          <Pencil />
          {translate('auto.components.sidebar.agentsView.rename', 'Rename')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleUnread}>
          {isUnread ? <Bell /> : <BellDot />}
          {isUnread
            ? translate('auto.components.sidebar.agentsView.markAsRead', 'Mark as Read')
            : translate('auto.components.sidebar.agentsView.markAsUnread', 'Mark as Unread')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onArchive}>
          <Archive />
          {translate('auto.components.sidebar.agentsView.archive', 'Archive')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
