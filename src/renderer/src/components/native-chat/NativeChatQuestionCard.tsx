import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { formatAskAnswer, type AskPrompt } from './native-chat-interactive-prompt'

export type NativeChatQuestionCardProps = {
  prompt: AskPrompt
  /** Send the formatted answer text to the agent. */
  onAnswer: (text: string) => void
  /** Dismiss the prompt (sends Escape to the agent). */
  onCancel: () => void
}

// Synthetic option value for the "Other…" free-text row, kept out of the
// answer text and replaced by the typed value when selected.
const OTHER = '__other__'

// Cursor labels each option with a sequential letter badge (A, B, C, …).
const letterFor = (i: number): string => String.fromCharCode(65 + i)

/**
 * Native renderer for an agent's AskUserQuestion prompt, styled 1:1 with
 * Cursor's Questions card: a "Questions" header with `‹ N of N ›` paging and a
 * collapse chevron, the question in semibold, lettered option rows (A/B/C… plus
 * an "Other…" row that reveals a free-text input), and a right-aligned
 * Skip / Next footer. Single- or multi-select per question; Next advances and
 * submits on the last step.
 */
export function NativeChatQuestionCard({
  prompt,
  onAnswer,
  onCancel
}: NativeChatQuestionCardProps): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [selections, setSelections] = useState<string[][]>(() => prompt.questions.map(() => []))
  const [otherText, setOtherText] = useState<string[]>(() => prompt.questions.map(() => ''))

  const toggle = (qi: number, label: string, multi: boolean): void => {
    setSelections((prev) => {
      const next = prev.map((s) => [...s])
      const cur = next[qi] ?? []
      if (multi) {
        next[qi] = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]
      } else {
        next[qi] = cur.includes(label) ? [] : [label]
      }
      return next
    })
  }

  const setOther = (qi: number, value: string): void => {
    setOtherText((prev) => {
      const next = [...prev]
      next[qi] = value
      return next
    })
  }

  // The resolved answer for a question: picked labels plus the typed "Other"
  // value (which replaces the synthetic OTHER marker).
  const answerFor = (qi: number): string => {
    const picked = (selections[qi] ?? []).filter((l) => l !== OTHER)
    const other = (selections[qi] ?? []).includes(OTHER) ? (otherText[qi] ?? '').trim() : ''
    return [...picked, other].filter((p) => p.length > 0).join(', ')
  }

  const total = prompt.questions.length
  const isLast = index === total - 1
  const currentAnswered = useMemo(
    () => answerFor(index).length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selections, otherText, index]
  )

  const submit = (): void => {
    // Build per-question label lists, substituting the typed Other value, then
    // format to one line per answered question.
    const resolved = prompt.questions.map((_, i) => {
      const picked = (selections[i] ?? []).filter((l) => l !== OTHER)
      const other = (selections[i] ?? []).includes(OTHER) ? (otherText[i] ?? '').trim() : ''
      return [...picked, ...(other ? [other] : [])]
    })
    const text = formatAskAnswer(prompt, resolved)
    if (text.length > 0) {
      onAnswer(text)
    }
  }

  const advance = (): void => {
    if (isLast) {
      submit()
    } else {
      setIndex((i) => Math.min(i + 1, total - 1))
    }
  }

  const q = prompt.questions[index]!
  const otherSelected = (selections[index] ?? []).includes(OTHER)

  return (
    <div className="shrink-0 px-3 pb-2 sm:px-4">
      <div className="mx-auto flex max-h-[24rem] w-full max-w-3xl flex-col rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        {/* Header: "Questions" · ‹ N of N › · collapse */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">
            {translate('components.native-chat.question.title', 'Questions')}
          </span>
          <div className="flex items-center gap-0.5 text-muted-foreground">
            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                  disabled={index === 0}
                  className="flex size-6 items-center justify-center rounded-md hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  aria-label={translate(
                    'components.native-chat.question.prev',
                    'Previous question'
                  )}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-0.5 text-xs tabular-nums">
                  {translate('components.native-chat.question.pager', '{{value0}} of {{value1}}', {
                    value0: index + 1,
                    value1: total
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                  disabled={isLast}
                  className="flex size-6 items-center justify-center rounded-md hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  aria-label={translate('components.native-chat.question.next', 'Next question')}
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="ml-0.5 flex size-6 items-center justify-center rounded-md hover:text-foreground"
              aria-label={translate('components.native-chat.question.collapse', 'Collapse')}
            >
              <ChevronDown
                className={cn('size-4 transition-transform', collapsed && '-rotate-90')}
              />
            </button>
          </div>
        </div>

        {collapsed ? null : (
          <>
            <p className="mt-2.5 text-[15px] font-semibold leading-snug text-foreground">
              {q.question}
            </p>

            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-sleek">
              {q.options.map((opt, i) => (
                <OptionRow
                  key={opt.label}
                  letter={letterFor(i)}
                  label={opt.label}
                  description={opt.description}
                  selected={(selections[index] ?? []).includes(opt.label)}
                  onSelect={() => toggle(index, opt.label, q.multiSelect)}
                />
              ))}
              <OptionRow
                letter={letterFor(q.options.length)}
                label={translate('components.native-chat.question.other', 'Other…')}
                selected={otherSelected}
                onSelect={() => toggle(index, OTHER, q.multiSelect)}
              />
              {otherSelected ? (
                <textarea
                  autoFocus
                  value={otherText[index]}
                  onChange={(e) => setOther(index, e.target.value)}
                  placeholder={translate(
                    'components.native-chat.question.otherPlaceholder',
                    'Type your answer'
                  )}
                  rows={2}
                  className="ml-9 mt-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                />
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {translate('components.native-chat.question.skip', 'Skip')}
              </button>
              <button
                type="button"
                onClick={advance}
                disabled={!currentAnswered}
                className={cn(
                  'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors',
                  'hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                {translate('components.native-chat.question.next', 'Next')}
                <CornerDownLeft className="size-3.5 opacity-80" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OptionRow({
  letter,
  label,
  description,
  selected,
  onSelect
}: {
  letter: string
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {letter}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-sm leading-snug text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
