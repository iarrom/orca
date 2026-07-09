import type { NativeChatContextMenuActions } from './use-native-chat-context-menu'

/** No-op context-menu actions for the terminal overlay, which has no pane
 *  chrome to split/expand/close. The agent-panel column passes real handlers. */
export const emptyNativeChatContextMenuActions: Omit<NativeChatContextMenuActions, 'onPaste'> = {
  onSplitRight: () => {},
  onSplitDown: () => {},
  canEqualizePaneSizes: false,
  onEqualizePaneSizes: () => {},
  canExpandPane: false,
  isPaneExpanded: false,
  onToggleExpand: () => {},
  onForkAgentSession: () => {},
  onSetTitle: () => {},
  onCopyTerminalId: () => {},
  onCopyPaneId: () => {},
  canClosePane: false,
  onClosePane: () => {}
}
