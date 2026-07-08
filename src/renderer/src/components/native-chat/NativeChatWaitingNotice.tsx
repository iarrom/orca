// [FORK] Явная индикация hook-состояния waiting: агент стоит у приглашения
// ввода в TUI (пермишен, вопрос, ошибка API с ретраями), а карточки вопроса
// нет — без этой строки чат выглядит «завершённым» (Worked), хотя агент
// заблокирован и ждёт человека в терминале.
import { CircleAlert } from 'lucide-react'
import { translate } from '@/i18n/i18n'

export function NativeChatWaitingNotice({
  onOpenTerminal
}: {
  onOpenTerminal?: () => void
}): React.JSX.Element {
  const label = translate(
    'components.native-chat.waitingInTerminal',
    'The agent is waiting for input in the terminal'
  )
  const body = (
    <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
      <CircleAlert className="size-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  )
  if (!onOpenTerminal) {
    return <div className="mx-auto w-full max-w-xl px-3 py-1 sm:px-4">{body}</div>
  }
  return (
    <div className="mx-auto w-full max-w-xl px-3 py-1 sm:px-4">
      <button
        type="button"
        onClick={onOpenTerminal}
        className="flex w-fit items-center rounded-md text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {body}
      </button>
    </div>
  )
}
