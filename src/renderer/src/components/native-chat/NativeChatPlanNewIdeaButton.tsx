// [FORK] Cursor-parity "Plan New Idea" button under the composer: turns plan mode
// on (same Shift+Tab chord wired in the composer keydown handler). Shown only for
// a fresh chat with plan mode off — once on, the composer's amber "Plan" pill
// takes over — so this button only ever renders its off-state.

import { translate } from '@/i18n/i18n'

// Shift is `⇧` on Mac and spelled out elsewhere (cross-platform label rule).
const SHIFT_TAB_LABEL = navigator.userAgent.includes('Mac') ? '⇧Tab' : 'Shift+Tab'

export function NativeChatPlanNewIdeaButton({
  onToggle,
  disabled
}: {
  onToggle: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-input/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11"
    >
      <span>{translate('components.native-chat.composer.planNewIdea', 'Plan New Idea')}</span>
      <span className="text-muted-foreground/60">{SHIFT_TAB_LABEL}</span>
    </button>
  )
}
