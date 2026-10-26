import type { MathFraction, MathFractionCommand, MathRadical } from '../../model/types';
import type { MathStructureParser } from '../types';

/**
 * Reads a prefix fraction-like command with two arguments.
 * @param parser - Recursive argument authority.
 * @param command - `\frac`, `\dfrac`, `\binom` or another prefix fraction command.
 * @param start - Original command offset.
 * @returns Complete fraction.
 */
export function parseMathFraction(parser: MathStructureParser, command: string, start: number): MathFraction {
  if (command === 'over' || command === 'choose' || command === 'atop') {
    return parser.reader.fail('unexpected-token', `Misplaced \\${command}.`, start);
  }
  const numerator = parser.argument();
  const denominator = parser.argument();
  return { kind: 'fraction', command: command as MathFractionCommand, numerator, denominator, source: { start, end: parser.reader.offset } };
}

/**
 * Reads a square or explicit-degree root.
 * @param parser - Recursive argument authority.
 * @param start - Original command offset.
 * @returns Radical whose absent degree is distinct from an empty one.
 */
export function parseMathRadical(parser: MathStructureParser, start: number): MathRadical {
  const degree = parser.optional();
  const radicand = parser.argument();
  return { kind: 'radical', radicand, ...(degree ? { degree } : {}), source: { start, end: parser.reader.offset } };
}
