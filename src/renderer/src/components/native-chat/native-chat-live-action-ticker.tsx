// [FORK] Пока агент работает, чат показывает не весь хвост шагов, а одну
// строку текущего действия (с шиммером). При смене действия старая строка
// уходит вверх с fade, новая поднимается снизу. Полный след шагов остаётся
// доступен после завершения хода через свёрнутый «Worked for …».
import { useEffect, useState } from 'react'
import type { CommentMarkdownLinkClickHandler } from '@/components/sidebar/CommentMarkdown'
import {
  isTextBlock,
  type NativeChatMessage,
  type NativeChatToolCallBlock,
  type NativeChatToolResultBlock
} from '../../../../shared/native-chat-types'
import { splitNativeChatBlocks } from './native-chat-tool-fold'
import { pairToolBlocks } from './native-chat-tool-pairing'
import { NativeChatToolStep } from './NativeChatToolStep'
import { NativeChatThoughtStep } from './NativeChatThoughtStep'

const LIVE_ACTION_LEAVE_MS = 260

export type NativeChatLiveAction =
  | { key: string; kind: 'thought'; markdown: string }
  | {
      key: string
      kind: 'tool'
      call: NativeChatToolCallBlock | null
      result: NativeChatToolResultBlock | null
    }

/** Последнее «действие» живого хода: активный (или последний) tool-степ
 *  новейшего сообщения с инструментами, либо размышление. Прозу пропускаем —
 *  стриминговый текст рендерится отдельным пузырём. Exported for tests. */
export function deriveCurrentLiveAction(
  steps: readonly NativeChatMessage[]
): NativeChatLiveAction | null {
  for (let m = steps.length - 1; m >= 0; m--) {
    const message = steps[m]
    if (message.role === 'reasoning') {
      const markdown = message.blocks
        .filter(isTextBlock)
        .map((block) => block.text)
        .join('\n\n')
      return { key: `${message.id}:thought`, kind: 'thought', markdown }
    }
    if (!splitNativeChatBlocks(message.blocks).tools.length) {
      continue
    }
    // [FORK] Результат инструмента приходит отдельным сообщением от вызова
    // (транскрипт Claude), поэтому спариваем через ВЕСЬ ход: иначе последний
    // степ — «сирота» без call, и тикер показывал бы сырой вывод («Exit code
    // 2…») вместо действия («Grep …»).
    const toolSteps = pairToolBlocks(
      steps.slice(0, m + 1).flatMap((step) => splitNativeChatBlocks(step.blocks).tools)
    )
    if (toolSteps.length === 0) {
      continue
    }
    // Как activeToolIndex в MessageRow: последний вызов без результата, иначе
    // последний степ.
    let index = toolSteps.length - 1
    for (let i = toolSteps.length - 1; i >= 0; i--) {
      if (toolSteps[i].call && !toolSteps[i].result) {
        index = i
        break
      }
    }
    const step = toolSteps[index]
    return {
      key: `${message.id}:tool:${index}`,
      kind: 'tool',
      call: step.call,
      result: step.result
    }
  }
  return null
}

function LiveActionRow({
  action,
  active,
  onLinkClick,
  allowFileUriLinks
}: {
  action: NativeChatLiveAction
  active: boolean
  onLinkClick?: CommentMarkdownLinkClickHandler
  allowFileUriLinks: boolean
}): React.JSX.Element {
  if (action.kind === 'thought') {
    return (
      <NativeChatThoughtStep
        markdown={action.markdown}
        active={active}
        durationLabel=""
        onLinkClick={onLinkClick}
        allowFileUriLinks={allowFileUriLinks}
      />
    )
  }
  return <NativeChatToolStep call={action.call} result={action.result} active={active} />
}

export function NativeChatLiveActionTicker({
  action,
  onLinkClick,
  allowFileUriLinks = false
}: {
  action: NativeChatLiveAction | null
  onLinkClick?: CommentMarkdownLinkClickHandler
  allowFileUriLinks?: boolean
}): React.JSX.Element | null {
  // Паттерн «derived state during render»: предыдущее действие хранится в
  // состоянии и при смене key становится «уходящей» строкой на время анимации.
  const [previous, setPrevious] = useState<NativeChatLiveAction | null>(action)
  const [leaving, setLeaving] = useState<NativeChatLiveAction | null>(null)
  if ((action?.key ?? null) !== (previous?.key ?? null)) {
    setPrevious(action)
    if (previous) {
      setLeaving(previous)
    }
  } else if (action !== previous) {
    // Тот же key, свежее содержимое (например, пришёл результат) — обновляем
    // снимок, чтобы следующая смена уводила актуальную строку.
    setPrevious(action)
  }

  useEffect(() => {
    if (!leaving) {
      return undefined
    }
    const timer = window.setTimeout(() => setLeaving(null), LIVE_ACTION_LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  if (!action) {
    return null
  }

  return (
    <div className="relative overflow-hidden">
      {leaving && leaving.key !== action.key ? (
        <div
          key={`leaving-${leaving.key}`}
          aria-hidden
          className="native-chat-live-action-leave pointer-events-none absolute inset-x-0 top-0"
        >
          <LiveActionRow
            action={leaving}
            active={false}
            onLinkClick={onLinkClick}
            allowFileUriLinks={allowFileUriLinks}
          />
        </div>
      ) : null}
      <div key={action.key} className={leaving ? 'native-chat-live-action-enter' : undefined}>
        <LiveActionRow
          action={action}
          active
          onLinkClick={onLinkClick}
          allowFileUriLinks={allowFileUriLinks}
        />
      </div>
    </div>
  )
}
