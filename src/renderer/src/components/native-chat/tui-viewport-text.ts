// [FORK] Plain-text decoding of a serialized alt-screen terminal viewport
// (pty:getMainBufferSnapshot data). Unlike the coarse scrollback strip in
// native-chat-scrape-fallback.ts, this keeps layout intact: the xterm
// serializer encodes runs of blank cells as cursor-forward (CSI n C) jumps, so
// dropping them would glue adjacent words together. They must become spaces
// BEFORE the generic CSI strip runs.

const ESC = String.fromCharCode(27)
const OSC_SEQUENCE_PATTERN = new RegExp(`${ESC}\\][^\\u0007]*(?:\\u0007|${ESC}\\\\)`, 'g')
const CURSOR_FORWARD_PATTERN = new RegExp(`${ESC}\\[(\\d*)C`, 'g')
const ANSI_ESCAPE_PATTERN = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]`, 'g')
const SINGLE_ESCAPE_PATTERN = new RegExp(`${ESC}(?:[@-Z\\\\-_]|[()*+\\-./][0-~]|c)`, 'g')

function stripUnsupportedControlCharacters(value: string): string {
  let result = ''
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      continue
    }
    result += char
  }
  return result
}

/**
 * Decode a serialized terminal viewport into trimmed-right text lines, in
 * screen order. Pure; safe to reuse in tests.
 */
export function decodeTuiViewportLines(data: string): string[] {
  const text = stripUnsupportedControlCharacters(
    data
      .replace(OSC_SEQUENCE_PATTERN, '')
      .replace(CURSOR_FORWARD_PATTERN, (_, count: string) => ' '.repeat(Number(count || '1')))
      .replace(ANSI_ESCAPE_PATTERN, '')
      .replace(SINGLE_ESCAPE_PATTERN, '')
  )
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  return text.split('\n').map((line) => line.replace(/\s+$/, ''))
}
