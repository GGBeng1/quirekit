import type { MathFunction, MathFunctionName, MathOperator, MathOperatorName, MathSequence } from '../../model/types';
import { mathOperatorCommands } from '../commands';
import type { MathStructureParser } from '../types';
import { parseMathScripts } from './scripts';

/**
 * Binds an immediately following brace group as the operand, following TeX ownership:
 * a group that is itself followed by a script belongs to that script instead.
 * The lookahead only matches braces, so nested operators are parsed once.
 * @param parser - Recursive argument authority.
 * @returns Bound operand, or undefined when the operand is ordinary following content.
 */
function boundGroup(parser: MathStructureParser): MathSequence | undefined {
  const { reader } = parser;
  reader.whitespace();
  if (reader.source[reader.offset] !== '{') return undefined;
  const end = reader.groupEnd(reader.offset);
  if (end < 0) return undefined;
  const next = reader.peekAfter(end);
  if (next === '^' || next === '_') return undefined;
  return parser.argument(true);
}

/**
 * Reads one large operator or named function with its own limits and optional operand.
 * @param parser - Recursive parse authority.
 * @param name - Admitted control word.
 * @param start - Command source start.
 * @returns Operator or function; `\sum_{i} a_i` and `\sin x` keep the operand as siblings.
 */
export function parseMathOperator(parser: MathStructureParser, name: string, start: number): MathOperator | MathFunction {
  const { reader } = parser;
  if (Object.hasOwn(mathOperatorCommands, name)) {
    const operator = name as MathOperatorName;
    let placement = mathOperatorCommands[operator][1];
    reader.whitespace();
    if (reader.stops(['\\limits', '\\nolimits'])) placement = reader.command() === 'limits' ? 'above-below' : 'side';
    const { subscript: lower, superscript: upper } = parseMathScripts(parser);
    const body = boundGroup(parser);
    return { kind: 'operator', name: operator, placement, ...(lower ? { lower } : {}), ...(upper ? { upper } : {}), ...(body ? { body } : {}), source: { start, end: reader.offset } };
  }
  const scripts = parseMathScripts(parser);
  const argument = boundGroup(parser);
  return { kind: 'function', name: name as MathFunctionName, ...scripts, ...(argument ? { argument } : {}), source: { start, end: reader.offset } };
}
