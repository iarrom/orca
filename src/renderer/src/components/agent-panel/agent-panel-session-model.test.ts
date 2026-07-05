// [FORK] Тесты чистой модели полосы сессий панели агентов.
import { describe, expect, it } from 'vitest'
import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import type { TerminalLayoutSnapshot, TerminalTab } from '../../../../shared/types'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import {
  buildAgentPanelSessions,
  resolveAgentPanelPtyId,
  resolveAgentPanelTargetSession
} from './agent-panel-session-model'

const LEAF_A = '11111111-1111-4111-8111-111111111111'
const LEAF_B = '22222222-2222-4222-8222-222222222222'

function makeTab(id: string, overrides: Partial<TerminalTab> = {}): TerminalTab {
  return {
    id,
    worktreeId: 'wt-1',
    ptyId: null,
    title: `Terminal ${id}`,
    customTitle: null,
    color: null,
    sortOrder: 0,
    createdAt: 100,
    ...overrides
  }
}

function makeRow(
  paneKey: string,
  tab: TerminalTab,
  overrides: Partial<DashboardAgentRow> = {}
): DashboardAgentRow {
  const entry: AgentStatusEntry = {
    paneKey,
    state: 'working',
    prompt: paneKey,
    updatedAt: 1000,
    stateStartedAt: 1000,
    stateHistory: [],
    agentType: 'claude'
  }
  return {
    paneKey,
    entry,
    tab,
    agentType: 'claude',
    state: 'working',
    startedAt: 1000,
    ...overrides
  }
}

describe('buildAgentPanelSessions', () => {
  it('maps rows to sessions keyed by paneKey', () => {
    const tab = makeTab('tab-1', { launchAgent: 'claude', customTitle: 'Fix bug' })
    const sessions = buildAgentPanelSessions([makeRow(`tab-1:${LEAF_A}`, tab)], [tab])
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      key: `tab-1:${LEAF_A}`,
      tabId: 'tab-1',
      paneKey: `tab-1:${LEAF_A}`,
      agent: 'claude',
      title: 'Fix bug',
      state: 'working'
    })
  })

  it('synthesizes a starting session for a just-launched agent tab without rows', () => {
    const launched = makeTab('tab-new', { launchAgent: 'cursor', createdAt: 5000 })
    const plain = makeTab('tab-shell')
    const sessions = buildAgentPanelSessions([], [launched, plain])
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      key: 'tab-new:',
      tabId: 'tab-new',
      paneKey: null,
      agent: 'cursor',
      state: 'starting',
      startedAt: 5000
    })
  })

  it('does not duplicate a tab already covered by a row', () => {
    const tab = makeTab('tab-1', { launchAgent: 'claude' })
    const sessions = buildAgentPanelSessions([makeRow(`tab-1:${LEAF_A}`, tab)], [tab])
    expect(sessions).toHaveLength(1)
  })

  it('falls back to launchAgent when the row agent type is unknown', () => {
    const tab = makeTab('tab-1', { launchAgent: 'cursor' })
    const row = makeRow(`tab-1:${LEAF_A}`, tab, { agentType: 'unknown' })
    const sessions = buildAgentPanelSessions([row], [tab])
    expect(sessions[0].agent).toBe('cursor')
  })
})

describe('resolveAgentPanelTargetSession', () => {
  const tabA = makeTab('tab-a', { launchAgent: 'claude' })
  const tabB = makeTab('tab-b', { launchAgent: 'codex' })
  const sessions = buildAgentPanelSessions(
    [
      makeRow(`tab-a:${LEAF_A}`, tabA, { startedAt: 1000 }),
      makeRow(`tab-b:${LEAF_B}`, tabB, { startedAt: 2000 })
    ],
    [tabA, tabB]
  )

  it('returns null when there are no sessions', () => {
    expect(resolveAgentPanelTargetSession([], `tab-a:${LEAF_A}`, 'tab-a')).toBeNull()
  })

  it('prefers the exact selected session key', () => {
    const target = resolveAgentPanelTargetSession(sessions, `tab-a:${LEAF_A}`, 'tab-b')
    expect(target?.tabId).toBe('tab-a')
  })

  it('falls back to the same tab when the selected paneKey is gone (leaf drift)', () => {
    const target = resolveAgentPanelTargetSession(sessions, `tab-a:${LEAF_B}`, null)
    expect(target?.tabId).toBe('tab-a')
  })

  it('matches a synthetic `tabId:` selection saved at launch time', () => {
    const target = resolveAgentPanelTargetSession(sessions, 'tab-b:', null)
    expect(target?.tabId).toBe('tab-b')
  })

  it('uses the active tab when there is no valid selection', () => {
    const target = resolveAgentPanelTargetSession(sessions, 'tab-gone:', 'tab-a')
    expect(target?.tabId).toBe('tab-a')
  })

  it('falls back to the most recently started session', () => {
    const target = resolveAgentPanelTargetSession(sessions, null, null)
    expect(target?.tabId).toBe('tab-b')
  })
})

describe('resolveAgentPanelPtyId', () => {
  const layouts: Record<string, TerminalLayoutSnapshot | undefined> = {
    'tab-a': {
      root: { type: 'leaf', id: LEAF_A },
      activeLeafId: LEAF_A,
      ptyIdsByLeafId: { [LEAF_A]: 'pty-leaf' }
    } as unknown as TerminalLayoutSnapshot
  }

  it('prefers the leaf-bound pty when it is still alive', () => {
    const ptyId = resolveAgentPanelPtyId(
      { tabId: 'tab-a', paneKey: `tab-a:${LEAF_A}` },
      { 'tab-a': ['pty-other', 'pty-leaf'] },
      layouts
    )
    expect(ptyId).toBe('pty-leaf')
  })

  it('falls back to the first live tab pty when the leaf pty is dead', () => {
    const ptyId = resolveAgentPanelPtyId(
      { tabId: 'tab-a', paneKey: `tab-a:${LEAF_A}` },
      { 'tab-a': ['pty-other'] },
      { 'tab-a': undefined }
    )
    expect(ptyId).toBe('pty-other')
  })

  it('uses the tab ptyId for a synthetic session without live pty list', () => {
    const ptyId = resolveAgentPanelPtyId({ tabId: 'tab-a', paneKey: null }, {}, {}, 'pty-tab')
    expect(ptyId).toBe('pty-tab')
  })
})
