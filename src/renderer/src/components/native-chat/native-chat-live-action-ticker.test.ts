// [FORK] Тикер текущего действия: из живого хвоста шагов выбирается ровно одно
// действие — активный tool-вызов новейшего сообщения либо размышление.
import { describe, expect, it } from 'vitest'
import type { NativeChatBlock, NativeChatMessage } from '../../../../shared/native-chat-types'
import { deriveCurrentLiveAction } from './native-chat-live-action-ticker'

function message(
  id: string,
  role: NativeChatMessage['role'],
  blocks: NativeChatBlock[]
): NativeChatMessage {
  return { id, role, blocks, timestamp: null, source: 'transcript' as NativeChatMessage['source'] }
}

const call = (name: string): NativeChatBlock => ({ type: 'tool-call', name, input: {} })
const result = (output = 'ok'): NativeChatBlock => ({ type: 'tool-result', output })

describe('deriveCurrentLiveAction', () => {
  it('returns null when there are no actionable steps', () => {
    expect(deriveCurrentLiveAction([])).toBeNull()
    expect(
      deriveCurrentLiveAction([message('m1', 'assistant', [{ type: 'text', text: 'hi' }])])
    ).toBeNull()
  })

  it('picks the last unresolved tool call of the newest tool message', () => {
    const steps = [
      message('m1', 'assistant', [call('Read'), result(), call('Edit'), result()]),
      message('m2', 'assistant', [call('Read'), result(), call('Bash')])
    ]
    const action = deriveCurrentLiveAction(steps)
    expect(action).toMatchObject({ key: 'm2:tool:1', kind: 'tool' })
    expect(action?.kind === 'tool' && action.call?.name).toBe('Bash')
  })

  it('falls back to the last resolved step when every call has a result', () => {
    const steps = [message('m1', 'assistant', [call('Read'), result(), call('Edit'), result()])]
    expect(deriveCurrentLiveAction(steps)).toMatchObject({ key: 'm1:tool:1', kind: 'tool' })
  })

  it('returns a thought action for a trailing reasoning message', () => {
    const steps = [
      message('m1', 'assistant', [call('Read'), result()]),
      message('m2', 'reasoning', [{ type: 'text', text: 'hmm' }])
    ]
    expect(deriveCurrentLiveAction(steps)).toMatchObject({
      key: 'm2:thought',
      kind: 'thought',
      markdown: 'hmm'
    })
  })

  it('skips trailing prose-only messages back to the last real action', () => {
    const steps = [
      message('m1', 'assistant', [call('Edit'), result()]),
      message('m2', 'assistant', [{ type: 'text', text: 'streaming prose' }])
    ]
    expect(deriveCurrentLiveAction(steps)).toMatchObject({ key: 'm1:tool:0', kind: 'tool' })
  })
})
