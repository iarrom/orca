// [FORK] Builds the Cursor-style left-hand composer controls — the model picker
// and the "+" menu (Image / Skills / MCP Servers) — as ready-to-slot nodes.
// Extracted from NativeChatComposer so that file stays within the max-lines
// budget; both nodes are passed straight through to NativeChatComposerActions.

import type { AgentType } from '../../../../shared/agent-status-types'
import { NativeChatModelPickerContainer } from './NativeChatModelPickerContainer'
import { NativeChatComposerAddMenu } from './NativeChatComposerAddMenu'
import {
  nativeChatComposerTargetIsRemote,
  type NativeChatResolvedTarget
} from './native-chat-composer-target'
import type { NativeChatModelSelectionState } from './use-native-chat-model-selection'

export function buildNativeChatComposerControls(params: {
  agent: AgentType
  terminalTabId: string
  targetPtyId: string | null
  disabled: boolean
  resolveTarget: () => NativeChatResolvedTarget | null
  selection: NativeChatModelSelectionState['selection']
  updateModelSelection: NativeChatModelSelectionState['update']
  pickAttachment: () => void
  insertTypedText: (text: string) => boolean
}): { modelPicker: React.ReactNode; addMenu: React.ReactNode } {
  const {
    agent,
    terminalTabId,
    targetPtyId,
    disabled,
    resolveTarget,
    selection,
    updateModelSelection,
    pickAttachment,
    insertTypedText
  } = params
  return {
    // Model picker next to the "+" button; the container owns the persisted
    // selection and types the matching slash command into the TUI.
    modelPicker: (
      <NativeChatModelPickerContainer
        agent={agent}
        disabled={disabled}
        resolveTarget={resolveTarget}
        selection={selection}
        update={updateModelSelection}
      />
    ),
    // "+" menu replacing the bare attach button; plan mode is toggled by the
    // dedicated "Plan New Idea" button (Shift+Tab), matching Cursor — not here.
    addMenu: (
      <NativeChatComposerAddMenu
        agent={agent}
        terminalTabId={terminalTabId}
        disabled={disabled}
        localSession={targetPtyId !== null && !nativeChatComposerTargetIsRemote(targetPtyId)}
        onAttachImage={pickAttachment}
        onInsertSkill={(skillName) => insertTypedText(`$${skillName} `)}
      />
    )
  }
}
