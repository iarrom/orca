// [FORK] Панельные агент-сессии в useTabGroupWorkspaceModel: managed-табы
// скрыты из таб-бара, не могут быть активными в группе и не задеваются
// bulk-close действиями. Харнес повторяет useTabGroupWorkspaceModel.focus.test.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activateTab: vi.fn(),
  closeBrowserTab: vi.fn(),
  closeEmptyGroup: vi.fn(),
  closeFile: vi.fn(),
  closeTab: vi.fn(),
  closeTerminalTab: vi.fn(),
  closeUnifiedTab: vi.fn(),
  createBrowserTab: vi.fn(),
  createEmptySplitGroup: vi.fn(),
  createTab: vi.fn(),
  dropUnifiedTab: vi.fn(),
  focusGroup: vi.fn(),
  focusTerminalTabSurface: vi.fn(),
  isWebRuntimeSessionActive: vi.fn(() => false),
  makePreviewFilePermanent: vi.fn(),
  moveUnifiedTabToGroup: vi.fn(),
  pinFile: vi.fn(),
  recordFeatureInteraction: vi.fn(),
  setActiveBrowserTab: vi.fn(),
  setActiveFile: vi.fn(),
  setActiveTab: vi.fn(),
  setActiveTabType: vi.fn(),
  setActiveWorktree: vi.fn(),
  setTabColor: vi.fn(),
  setTabCustomTitle: vi.fn()
}))

const storeBox = vi.hoisted(() => ({
  state: null as Record<string, unknown> | null
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react') // eslint-disable-line @typescript-eslint/consistent-type-imports -- vi.importActual requires inline import()
  return {
    ...actual,
    useCallback: <T>(callback: T) => callback,
    useMemo: <T>(factory: () => T) => factory(),
    // Конвергирующий эффект managed-активного таба выполняем синхронно, чтобы
    // ассертить перенос активности без рендера.
    useEffect: (effect: () => void | (() => void)) => {
      effect()
    }
  }
})

vi.mock('zustand/react/shallow', () => ({
  useShallow: <T>(selector: T) => selector
}))

vi.mock('../../store', () => {
  const useAppStore = Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(storeBox.state ?? {}),
    {
      getState: () => storeBox.state ?? {}
    }
  )
  return { useAppStore }
})

vi.mock('../../store/selectors', () => ({
  useAllWorktrees: () => [{ id: 'wt-1', path: '/worktree' }]
}))

vi.mock('../../lib/focus-terminal-tab-surface', () => ({
  focusTerminalTabSurface: mocks.focusTerminalTabSurface
}))

vi.mock('../terminal/terminal-tab-actions', () => ({
  closeTerminalTab: mocks.closeTerminalTab
}))

vi.mock('../../lib/worktree-runtime-owner', () => ({
  getRuntimeEnvironmentIdForWorktree: () => null
}))

vi.mock('../../runtime/web-runtime-session', () => ({
  activateWebRuntimeSessionTab: vi.fn(),
  closeWebRuntimeSessionTab: vi.fn(),
  createWebRuntimeSessionBrowserTab: vi.fn(),
  createWebRuntimeSessionTerminal: vi.fn(),
  isWebRuntimeSessionActive: mocks.isWebRuntimeSessionActive
}))

vi.mock('../../store/slices/browser-webview-cleanup', () => ({
  destroyWorkspaceWebviews: vi.fn()
}))

vi.mock('../../lib/create-untitled-markdown', () => ({
  createUntitledMarkdownFileWithTemplateSelection: vi.fn()
}))

vi.mock('../../lib/ipc-error', () => ({
  extractIpcErrorMessage: (_error: unknown, fallback: string) => fallback
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() }
}))

function makeTerminalTab(id: string, launchAgent?: string): Record<string, unknown> {
  return {
    id,
    ptyId: `pty-${id}`,
    worktreeId: 'wt-1',
    title: id,
    defaultTitle: id,
    customTitle: null,
    color: null,
    sortOrder: 0,
    createdAt: 0,
    ...(launchAgent ? { launchAgent } : {})
  }
}

function makeUnifiedTab(id: string, entityId: string, groupId = 'group-1') {
  return {
    id,
    entityId,
    groupId,
    worktreeId: 'wt-1',
    contentType: 'terminal',
    label: entityId,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0
  }
}

function resetStore(opts?: {
  activeTabId?: string
  recentTabIds?: string[]
  extraGroup?: boolean
}): void {
  storeBox.state = {
    activeWorktreeId: 'wt-1',
    browserTabsByWorktree: {},
    expandedPaneByTabId: {},
    groupsByWorktree: {
      'wt-1': [
        {
          id: 'group-1',
          worktreeId: 'wt-1',
          activeTabId: opts?.activeTabId ?? 'unified-terminal-1',
          tabOrder: ['unified-terminal-1', 'unified-agent-1'],
          recentTabIds: opts?.recentTabIds ?? []
        },
        ...(opts?.extraGroup
          ? [
              {
                id: 'group-2',
                worktreeId: 'wt-1',
                activeTabId: null,
                tabOrder: [],
                recentTabIds: []
              }
            ]
          : [])
      ]
    },
    openFiles: [],
    reconcileWorktreeTabModel: vi.fn(() => ({ renderableTabCount: 1 })),
    settings: { activeRuntimeEnvironmentId: null },
    tabsByWorktree: {
      'wt-1': [makeTerminalTab('terminal-1'), makeTerminalTab('agent-1', 'claude')]
    },
    terminalLayoutsByTabId: {},
    unifiedTabsByWorktree: {
      'wt-1': [
        makeUnifiedTab('unified-terminal-1', 'terminal-1'),
        makeUnifiedTab('unified-agent-1', 'agent-1')
      ]
    },
    activateTab: mocks.activateTab,
    closeBrowserTab: mocks.closeBrowserTab,
    closeEmptyGroup: mocks.closeEmptyGroup,
    closeFile: mocks.closeFile,
    closeTab: mocks.closeTab,
    closeUnifiedTab: mocks.closeUnifiedTab,
    createBrowserTab: mocks.createBrowserTab,
    createEmptySplitGroup: mocks.createEmptySplitGroup,
    createTab: mocks.createTab,
    dropUnifiedTab: mocks.dropUnifiedTab,
    focusGroup: mocks.focusGroup,
    makePreviewFilePermanent: mocks.makePreviewFilePermanent,
    moveUnifiedTabToGroup: mocks.moveUnifiedTabToGroup,
    openNewBrowserTabInActiveWorkspace: vi.fn(),
    openNewMarkdownInActiveWorkspace: vi.fn(),
    openNewTerminalTabInActiveWorkspace: vi.fn(),
    pinFile: mocks.pinFile,
    recordFeatureInteraction: mocks.recordFeatureInteraction,
    setActiveBrowserTab: mocks.setActiveBrowserTab,
    setActiveFile: mocks.setActiveFile,
    setActiveTab: mocks.setActiveTab,
    setActiveTabType: mocks.setActiveTabType,
    setActiveWorktree: mocks.setActiveWorktree,
    setTabColor: mocks.setTabColor,
    setTabCustomTitle: mocks.setTabCustomTitle
  }
}

describe('useTabGroupWorkspaceModel agent panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('hides panel-managed agent tabs from the group terminal tab list', async () => {
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    expect(model.terminalTabs.map((tab) => tab.id)).toEqual(['terminal-1'])
  })

  it('never reports a managed tab as active and converges the store to a visible tab', async () => {
    resetStore({
      activeTabId: 'unified-agent-1',
      recentTabIds: ['unified-agent-1', 'unified-terminal-1']
    })
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    expect(model.activeTab).toBeNull()
    expect(mocks.activateTab).toHaveBeenCalledWith('unified-terminal-1')
  })

  it('keeps the store untouched when the active tab is a plain terminal', async () => {
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    expect(model.activeTab?.id).toBe('unified-terminal-1')
    expect(mocks.activateTab).not.toHaveBeenCalled()
  })

  it('excludes managed sessions from closeOthers', async () => {
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    model.commands.closeOthers('unified-terminal-1')

    expect(mocks.closeTab).not.toHaveBeenCalled()
    expect(mocks.closeUnifiedTab).not.toHaveBeenCalled()
  })

  it('moves managed sessions to a sibling group instead of killing them on closeGroup', async () => {
    resetStore({ extraGroup: true })
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    model.commands.closeGroup()

    expect(mocks.closeTerminalTab).toHaveBeenCalledWith('terminal-1')
    expect(mocks.closeTerminalTab).not.toHaveBeenCalledWith('agent-1')
    expect(mocks.moveUnifiedTabToGroup).toHaveBeenCalledWith('unified-agent-1', 'group-2', {
      activate: false
    })
    expect(mocks.closeEmptyGroup).toHaveBeenCalledWith('wt-1', 'group-1')
  })

  it('keeps managed sessions in place when closing the only group', async () => {
    const { useTabGroupWorkspaceModel } = await import('./useTabGroupWorkspaceModel')
    const model = useTabGroupWorkspaceModel({ groupId: 'group-1', worktreeId: 'wt-1' })

    model.commands.closeGroup()

    expect(mocks.closeTerminalTab).toHaveBeenCalledWith('terminal-1')
    expect(mocks.moveUnifiedTabToGroup).not.toHaveBeenCalled()
  })
})
