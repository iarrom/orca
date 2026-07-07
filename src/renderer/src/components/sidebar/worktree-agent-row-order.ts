import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'

function comparableNumber(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function comparePaneKeysOrdinal(a: string, b: string): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

export function compareWorktreeAgentRows(a: DashboardAgentRow, b: DashboardAgentRow): number {
  // [FORK] Новые сверху (Cursor-стиль): свежая сессия рендерится первой строкой.
  return (
    comparableNumber(b.startedAt) - comparableNumber(a.startedAt) ||
    comparableNumber(b.tab.createdAt) - comparableNumber(a.tab.createdAt) ||
    comparableNumber(a.tab.sortOrder) - comparableNumber(b.tab.sortOrder) ||
    comparePaneKeysOrdinal(a.paneKey, b.paneKey)
  )
}
