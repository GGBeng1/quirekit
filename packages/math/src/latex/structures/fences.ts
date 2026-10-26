import type { MathFence } from '../../model/types';
import type { MathStructureParser } from '../types';

const delimiters: Readonly<Record<string, string>> = Object.freeze({
  '(': '(', ')': ')', '[': '[', ']': ']', '|': '|', '/': '/', '.': '',
  '\\{': '{', '\\}': '}', '\\|': '‖', lbrace: '{', rbrace: '}', lbrack: '[', rbrack: ']',
  lvert: '|', rvert: '|', vert: '|', Vert: '‖', lVert: '‖', rVert: '‖', backslash: '\\',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', lgroup: '⟮', rgroup: '⟯',
  uparrow: '↑', downarrow: '↓', updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓', Updownarrow: '⇕',
  '<': '⟨', '>': '⟩',
});

/**
 * Reads one delimiter token after `\left`, `\right`, `\middle` or a size command.
 * @param parser - Source authority.
 * @returns Visible delimiter, or empty for an invisible `.`.
 */
export function readMathDelimiter(parser: MathStructureParser): string {
  const { reader } = parser;
  reader.whitespace();
  const start = reader.offset;
  let token: string | undefined;
  if (reader.source[start] === '\\') {
    const name = reader.command();
    token = name.length === 1 && !/[A-Za-z]/u.test(name) ? `\\${name}` : name;
  } else {
    token = reader.source[start];
    reader.offset++;
  }
  if (!token || !Object.hasOwn(delimiters, token)) return reader.fail('unexpected-token', 'Unsupported math delimiter.', start);
  return delimiters[token]!;
}

/**
 * Reads one stretchable pair; TeX allows any two delimiters, as in half-open intervals.
 * @param parser - Recursive grammar.
 * @param start - Opening command offset.
 * @returns Complete fenced expression.
 */
export function parseMathFence(parser: MathStructureParser, start: number): MathFence {
  const { reader } = parser;
  const open = readMathDelimiter(parser);
  reader.fences++;
  const content = { ...parser.sequence(['\\right']), boundary: 'fence' as const };
  reader.fences--;
  if (!reader.stops(['\\right'])) reader.fail('unexpected-token', 'Missing closing math delimiter.');
  reader.command();
  const close = readMathDelimiter(parser);
  return { kind: 'fence', open, close, content, source: { start, end: reader.offset } };
}
