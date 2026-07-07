// [FORK] Маппинг тул → иконка строки шага.
import { describe, expect, it } from 'vitest'
import { Bot, FilePen, FileText, Globe, Search, SquareTerminal, Wrench, Zap } from 'lucide-react'
import { getToolStepIcon, isMcpToolName } from './native-chat-tool-icon'

describe('getToolStepIcon', () => {
  it('maps builtin tools to semantic icons', () => {
    expect(getToolStepIcon('Bash')).toBe(SquareTerminal)
    expect(getToolStepIcon('shell')).toBe(SquareTerminal)
    expect(getToolStepIcon('Read')).toBe(FileText)
    expect(getToolStepIcon('Edit')).toBe(FilePen)
    expect(getToolStepIcon('apply_patch')).toBe(FilePen)
    expect(getToolStepIcon('Grep')).toBe(Search)
    expect(getToolStepIcon('WebSearch')).toBe(Globe)
    expect(getToolStepIcon('Task')).toBe(Bot)
  })

  it('maps MCP tools to the lightning icon (Cursor parity)', () => {
    expect(isMcpToolName('mcp__linear__create_issue')).toBe(true)
    expect(getToolStepIcon('mcp__linear__create_issue')).toBe(Zap)
  })

  it('falls back to a generic wrench for unknown tools and orphan results', () => {
    expect(getToolStepIcon('SomeNewTool')).toBe(Wrench)
    expect(getToolStepIcon(null)).toBe(Wrench)
    expect(isMcpToolName('Bash')).toBe(false)
  })
})
