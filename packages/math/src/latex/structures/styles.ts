import type { MathSequence, MathStyled, MathStyleName, MathText, MathTextName, MathTextRun } from '../../model/types';
import type { MathStructureParser } from '../types';

/** Control words admitted inside text mode, with their literal output. */
const textCommands: Readonly<Record<string, string>> = Object.freeze({
  textbackslash: '\\', textasciitilde: '~', textasciicircum: '^', textendash: '–', textemdash: '—',
  quad: '\u2003', qquad: '\u2003\u2003', ldots: '…', dots: '…', S: '§', P: '¶', copyright: '©',
});

/**
 * Reads a font or box command with one editable argument.
 * @param parser - Recursive argument authority.
 * @param command - Admitted style command.
 * @param start - Original command offset.
 * @returns Styled expression.
 */
export function parseMathStyled(parser: MathStructureParser, command: string, start: number): MathStyled {
  const { reader } = parser;
  let name = command as MathStyleName;
  if (name === 'operatorname' && reader.source[reader.offset] === '*') {
    reader.offset++;
    name = 'operatorname*';
  }
  const content = parser.argument();
  return { kind: 'styled', name, content, source: { start, end: reader.offset } };
}

/** Mutable state while scanning one text argument. */
interface TextScan {
  /** Completed runs and formulas. */
  readonly parts: (MathTextRun | MathSequence)[];
  /** Raw start of the current run. */
  from: number;
  /** Decoded value of the current run. */
  value: string;
}

/**
 * Closes the current run when it has visible text.
 * @param scan - Current scan state.
 * @param end - Raw end offset of the run.
 */
function flush(scan: TextScan, end: number): void {
  if (scan.value) scan.parts.push({ kind: 'run', value: scan.value, source: { start: scan.from, end } });
  scan.value = '';
}

/**
 * Appends decoded text; TeX collapses consecutive spaces into one.
 * @param scan - Current scan state.
 * @param text - Decoded characters.
 */
function append(scan: TextScan, text: string): void {
  if (text === ' ' && scan.value.endsWith(' ')) return;
  scan.value += text;
}

/**
 * Reads one text-mode escape or control word.
 * @param parser - Source authority.
 * @param scan - Current scan state.
 */
function textEscape(parser: MathStructureParser, scan: TextScan): void {
  const { reader } = parser;
  const start = reader.offset;
  const next = reader.source[start + 1] ?? '';
  if ('{}%&#$_ '.includes(next) && next) {
    reader.offset += 2;
    append(scan, next);
    return;
  }
  const word = /^[A-Za-z]+/u.exec(reader.source.slice(start + 1, start + 33))?.[0];
  if (!word || !Object.hasOwn(textCommands, word)) return reader.fail('unsupported-command', 'Unsupported command in text.', start);
  reader.offset += word.length + 1;
  append(scan, textCommands[word]!);
}

/**
 * Reads a text-mode argument: literal runs plus nested `$…$` formulas as editable slots.
 * @param parser - Recursive parse authority for nested formulas.
 * @param command - Admitted text command.
 * @param start - Original command offset.
 * @returns Text expression.
 */
export function parseMathText(parser: MathStructureParser, command: string, start: number): MathText {
  const { reader } = parser;
  const name = command as MathTextName;
  reader.whitespace();
  const scan: TextScan = { parts: [], from: reader.offset, value: '' };
  if (reader.source[reader.offset] !== '{') {
    const point = reader.source.codePointAt(reader.offset);
    if (point === undefined || /[\\{}$^_&#]/u.test(String.fromCodePoint(point))) reader.fail('missing-argument', 'Text requires an argument.');
    reader.offset += String.fromCodePoint(point!).length;
    scan.value = String.fromCodePoint(point!);
    flush(scan, reader.offset);
    return { kind: 'text', name, parts: scan.parts, source: { start, end: reader.offset } };
  }
  reader.offset++;
  scan.from = reader.offset;
  let depth = 1;
  // Text mode has its own lexical rules: braces only group, `$` switches back to math.
  while (depth) {
    const character = reader.source[reader.offset];
    if (character === undefined) return reader.fail('unexpected-token', 'Unclosed text argument.');
    if (character === '}') {
      depth--;
      if (!depth) flush(scan, reader.offset);
      reader.offset++;
    } else if (character === '{') {
      if (++depth > 64) reader.fail('limit-exceeded', 'Text nesting exceeds 64 levels.');
      reader.offset++;
    } else if (character === '$') {
      flush(scan, reader.offset);
      reader.offset++;
      scan.parts.push({ ...parser.sequence(['$']), boundary: 'dollar' });
      reader.expect('$');
      scan.from = reader.offset;
    } else if (character === '\\') {
      textEscape(parser, scan);
    } else if (character === '%') {
      const newline = reader.source.indexOf('\n', reader.offset);
      reader.offset = newline < 0 ? reader.source.length : newline + 1;
    } else if (/[\^_&#]/u.test(character)) {
      reader.fail('unexpected-token', 'Character is not allowed in text.');
    } else {
      const point = reader.source.codePointAt(reader.offset)!;
      if (point >= 0xd800 && point <= 0xdfff || point < 32 && !/\s/u.test(character)) reader.fail('unexpected-token', 'Invalid Unicode scalar.');
      const value = String.fromCodePoint(point);
      reader.offset += value.length;
      append(scan, character === '~' ? '\u00a0' : /\s/u.test(value) ? ' ' : value);
    }
  }
  return { kind: 'text', name, parts: scan.parts, source: { start, end: reader.offset } };
}
