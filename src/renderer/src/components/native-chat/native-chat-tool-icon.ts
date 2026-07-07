// [FORK] Иконка тула для строки шага в нейтив-чате (Cursor-parity): MCP-тулы
// получают «молнию», остальные — семантическую иконку по типу действия.
// Чистый маппинг, тестируется без рендера.
import {
  Bot,
  FilePen,
  FileText,
  Globe,
  ListTodo,
  Search,
  SquareTerminal,
  Wrench,
  Zap,
  type LucideIcon
} from 'lucide-react'

const ICON_BY_TOOL: Record<string, LucideIcon> = {
  Bash: SquareTerminal,
  BashOutput: SquareTerminal,
  shell: SquareTerminal,
  Read: FileText,
  Write: FilePen,
  Edit: FilePen,
  MultiEdit: FilePen,
  NotebookEdit: FilePen,
  str_replace: FilePen,
  apply_patch: FilePen,
  Grep: Search,
  Glob: Search,
  LS: Search,
  WebFetch: Globe,
  WebSearch: Globe,
  Task: Bot,
  TodoWrite: ListTodo,
  ExitPlanMode: ListTodo
}

export function isMcpToolName(name: string): boolean {
  return name.startsWith('mcp__')
}

export function getToolStepIcon(name: string | null): LucideIcon {
  if (!name) {
    return Wrench
  }
  if (isMcpToolName(name)) {
    return Zap
  }
  return ICON_BY_TOOL[name] ?? Wrench
}
