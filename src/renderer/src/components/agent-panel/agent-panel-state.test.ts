// [FORK] Тесты fork-стора панели агент-сессий.
import { beforeEach, describe, expect, it } from 'vitest'
import { agentPanelSessionKeyTabId, useAgentPanelState } from './agent-panel-state'

beforeEach(() => {
  useAgentPanelState.setState({
    selectedSessionKeyByWorktree: {},
    sessionViewBySessionKey: {},
    sidebarAgentsCollapsedByWorktreeId: {}
  })
})

describe('agentPanelSessionKeyTabId', () => {
  it('extracts the tab id from paneKey and synthetic keys', () => {
    expect(agentPanelSessionKeyTabId('tab-1:leaf')).toBe('tab-1')
    expect(agentPanelSessionKeyTabId('tab-1:')).toBe('tab-1')
    expect(agentPanelSessionKeyTabId('tab-1')).toBe('tab-1')
  })
})

describe('useAgentPanelState', () => {
  it('keeps selections isolated per worktree', () => {
    const state = useAgentPanelState.getState()
    state.selectSession('wt-1', 'tab-a:leaf')
    state.selectSession('wt-2', 'tab-b:leaf')
    expect(useAgentPanelState.getState().selectedSessionKeyByWorktree).toEqual({
      'wt-1': 'tab-a:leaf',
      'wt-2': 'tab-b:leaf'
    })
  })

  it('clearSessionSelection drops the selection only when it points at the closed tab', () => {
    const state = useAgentPanelState.getState()
    state.selectSession('wt-1', 'tab-a:leaf')
    state.clearSessionSelection('wt-1', 'tab-other')
    expect(useAgentPanelState.getState().selectedSessionKeyByWorktree['wt-1']).toBe('tab-a:leaf')
    state.clearSessionSelection('wt-1', 'tab-a')
    expect(useAgentPanelState.getState().selectedSessionKeyByWorktree['wt-1']).toBeUndefined()
  })

  it('clearSessionSelection prunes view modes of the closed tab sessions', () => {
    const state = useAgentPanelState.getState()
    state.setSessionView('tab-a:leaf', 'terminal')
    state.setSessionView('tab-b:leaf', 'terminal')
    state.clearSessionSelection('wt-1', 'tab-a')
    expect(useAgentPanelState.getState().sessionViewBySessionKey).toEqual({
      'tab-b:leaf': 'terminal'
    })
  })

  it('toggles sidebar collapse per worktree', () => {
    const state = useAgentPanelState.getState()
    state.toggleSidebarAgentsCollapsed('wt-1')
    expect(useAgentPanelState.getState().sidebarAgentsCollapsedByWorktreeId['wt-1']).toBe(true)
    useAgentPanelState.getState().toggleSidebarAgentsCollapsed('wt-1')
    expect(useAgentPanelState.getState().sidebarAgentsCollapsedByWorktreeId['wt-1']).toBe(false)
  })
})
