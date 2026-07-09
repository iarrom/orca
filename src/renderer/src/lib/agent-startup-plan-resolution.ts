import {
  buildAgentDraftLaunchPlan,
  buildAgentStartupPlan,
  type AgentStartupPlan
} from '@/lib/tui-agent-startup'
import { TUI_AGENT_CONFIG } from '../../../shared/tui-agent-config'
import type { TuiAgent } from '../../../shared/types'

/** Shared launch inputs (agent/shell/platform/env) spread into every plan
 *  builder — everything except the per-branch prompt fields. */
export type AgentStartupPlanBase = Omit<
  Parameters<typeof buildAgentStartupPlan>[0],
  'prompt' | 'allowEmptyPromptLaunch'
>

export type ResolvedAgentStartupPlan = {
  startupPlan: AgentStartupPlan | null
  /** Prompt to bracket-paste after launch (null when folded into the command). */
  pasteDraftAfterLaunch: string | null
  submitPastedPrompt: boolean
  forcePasteAfterLaunch: boolean
  /** True when the agent receives prompts via post-ready stdin paste; the caller
   *  reuses this to gate the initial chat view like a draft launch. */
  isFollowupPath: boolean
}

/**
 * Decide how a launch prompt reaches the agent. argv/flag agents fold the
 * prompt into the launch command and auto-submit; followup-path and generated
 * contexts launch clean and deliver the prompt via post-launch bracketed paste,
 * with the caller choosing whether that paste stays a draft or submits.
 */
export function resolveAgentStartupPlan(
  agent: TuiAgent,
  startupPlanBase: AgentStartupPlanBase,
  trimmedPrompt: string,
  promptDelivery: 'auto-submit' | 'draft' | 'submit-after-ready'
): ResolvedAgentStartupPlan {
  const hasPrompt = trimmedPrompt.length > 0
  const isFollowupPath = TUI_AGENT_CONFIG[agent].promptInjectionMode === 'stdin-after-start'
  let startupPlan: AgentStartupPlan | null = null
  let pasteDraftAfterLaunch: string | null = null
  let submitPastedPrompt = false
  let forcePasteAfterLaunch = false

  if (hasPrompt && promptDelivery === 'submit-after-ready') {
    // Why: generated multi-line prompts are too large to echo through a shell
    // argv/prefill command. Launch cleanly, then paste+submit inside the TUI.
    startupPlan = buildAgentStartupPlan({
      ...startupPlanBase,
      prompt: '',
      allowEmptyPromptLaunch: true
    })
    pasteDraftAfterLaunch = trimmedPrompt
    submitPastedPrompt = true
    forcePasteAfterLaunch = true
  } else if (hasPrompt && promptDelivery === 'draft') {
    const draftLaunchPlan = buildAgentDraftLaunchPlan({
      ...startupPlanBase,
      draft: trimmedPrompt
    })
    if (draftLaunchPlan) {
      startupPlan = {
        agent: draftLaunchPlan.agent,
        launchCommand: draftLaunchPlan.launchCommand,
        expectedProcess: draftLaunchPlan.expectedProcess,
        followupPrompt: null,
        launchConfig: draftLaunchPlan.launchConfig,
        ...(draftLaunchPlan.startupCommandDelivery
          ? { startupCommandDelivery: draftLaunchPlan.startupCommandDelivery }
          : {}),
        ...(draftLaunchPlan.env ? { env: draftLaunchPlan.env } : {})
      }
    } else {
      startupPlan = buildAgentStartupPlan({
        ...startupPlanBase,
        prompt: '',
        allowEmptyPromptLaunch: true
      })
      pasteDraftAfterLaunch = trimmedPrompt
    }
  } else if (hasPrompt && isFollowupPath) {
    startupPlan = buildAgentStartupPlan({
      ...startupPlanBase,
      prompt: '',
      allowEmptyPromptLaunch: true
    })
    pasteDraftAfterLaunch = trimmedPrompt
  } else {
    startupPlan = buildAgentStartupPlan({
      ...startupPlanBase,
      prompt: hasPrompt ? trimmedPrompt : '',
      allowEmptyPromptLaunch: !hasPrompt
    })
  }

  return {
    startupPlan,
    pasteDraftAfterLaunch,
    submitPastedPrompt,
    forcePasteAfterLaunch,
    isFollowupPath
  }
}
