import type { MathExpression, MathMarker } from '../../model/types';
import { mathDelimiterSizes, mathSpaceCommands, mathSwitchCommands } from '../styles';
import { mathNegatedSymbols, mathSymbolCommands } from '../symbols';
import type { MathStructureParser } from '../types';
import { readMathDelimiter } from './fences';
import { parseMathText } from './styles';

/**
 * Reads `\tag`, `\label` and numbering suppressors, which carry no mathematical content.
 * @param parser - Text argument authority.
 * @param name - Marker command.
 * @param start - Original command offset.
 * @returns Marker with its decoded argument.
 */
function marker(parser: MathStructureParser, name: string, start: number): MathMarker {
  const { reader } = parser;
  if (name === 'nonumber' || name === 'notag') return { kind: 'marker', command: name, source: { start, end: reader.offset } };
  let command: MathMarker['command'] = name as 'tag' | 'label';
  if (name === 'tag' && reader.source[reader.offset] === '*') {
    reader.offset++;
    command = 'tag*';
  }
  const text = parseMathText(parser, 'text', reader.offset);
  if (text.parts.some(part => part.kind !== 'run')) reader.fail('unsupported-command', 'Formulas inside a tag or label are not supported.');
  const value = text.parts.map(part => part.kind === 'run' ? part.value : '').join('');
  return { kind: 'marker', command, text: value, source: { start, end: reader.offset } };
}

/**
 * Reads symbols, spacing, sized delimiters, style switches, markers and `\not`.
 * @param parser - Recursive parse authority.
 * @param name - Control word or control symbol.
 * @param start - Original command offset.
 * @returns Complete leaf expression; unknown commands fail the whole parse.
 */
export function parseMathToken(parser: MathStructureParser, name: string, start: number): MathExpression {
  const { reader } = parser;
  if (Object.hasOwn(mathSpaceCommands, name)) return { kind: 'space', width: mathSpaceCommands[name]!, source: { start, end: reader.offset } };
  if (Object.hasOwn(mathDelimiterSizes, name)) {
    const value = readMathDelimiter(parser);
    return { kind: 'delimiter', value, size: mathDelimiterSizes[name]!, source: { start, end: reader.offset } };
  }
  if (name === 'middle') {
    if (!reader.fences) reader.fail('unexpected-token', '\\middle must be inside \\left and \\right.', start);
    const value = readMathDelimiter(parser);
    return { kind: 'delimiter', value, size: 'middle', source: { start, end: reader.offset } };
  }
  if (Object.hasOwn(mathSwitchCommands, name)) return { kind: 'switch', style: mathSwitchCommands[name]!, source: { start, end: reader.offset } };
  if (name === 'tag' || name === 'label' || name === 'nonumber' || name === 'notag') return marker(parser, name, start);
  if (name === 'not') {
    reader.whitespace();
    const negated = parser.atom();
    if (negated.kind !== 'symbol') return reader.fail('unexpected-token', '\\not must precede a relation symbol.', start);
    const value = mathNegatedSymbols[negated.value] ?? `${negated.value}\u0338`;
    return { kind: 'symbol', value, source: { start, end: reader.offset } };
  }
  const value = Object.hasOwn(mathSymbolCommands, name) ? mathSymbolCommands[name] : undefined;
  if (!value) return reader.fail('unsupported-command', `Unsupported command: ${name}.`, start);
  return { kind: 'symbol', value, source: { start, end: reader.offset } };
}
