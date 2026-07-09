// [FORK] Инлайн-переименование строки агента (Cursor-стиль): поле встаёт на
// место строки. Enter/blur — сохранить, Esc — отменить. Пустое значение
// очищает customTitle (возврат к автозаголовку из промпта).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function AgentRowRenameInput({
  initialValue,
  onCommit,
  onCancel,
  className
}: {
  initialValue: string
  onCommit: (value: string) => void
  onCancel: () => void
  className?: string
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Why: Escape/blur can both fire on the same commit path (blur follows the
  // parent unmount). Latch so the title is only written once.
  const settledRef = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [])

  const commit = useCallback(() => {
    if (settledRef.current) {
      return
    }
    settledRef.current = true
    onCommit(value.trim())
  }, [onCommit, value])

  const cancel = useCallback(() => {
    if (settledRef.current) {
      return
    }
    settledRef.current = true
    onCancel()
  }, [onCancel])

  return (
    <div className={cn('flex h-7 items-center rounded-md pl-4 pr-2', className)}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // Why: keep typing local — the sidebar list treats Enter/Space/arrows
          // as row navigation and would steal focus mid-rename.
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 rounded-sm bg-worktree-sidebar-accent px-1 py-0.5 text-sm leading-none text-foreground outline-none ring-1 ring-worktree-sidebar-ring"
      />
    </div>
  )
}
