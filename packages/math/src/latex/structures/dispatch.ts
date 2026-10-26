import type { MathExpression } from '../../model/types';
import { mathAccentCommands, mathFractionCommands, mathFunctionCommands, mathOperatorCommands } from '../commands';
import { mathStyleVariants, mathTextVariants } from '../styles';
import type { MathStructureParser } from '../types';
import { parseMathAccent } from './accents';
import { parseMathFence } from './fences';
import { parseMathFraction, parseMathRadical } from './fractions';
import { parseMathMatrix, parseMathSubstack } from './matrices';
import { parseMathOperator } from './operators';
import { parseMathStyled, parseMathText } from './styles';
import { parseMathToken } from './tokens';

/**
 * Routes one control sequence to the family that owns its grammar.
 * @param parser - Recursive parse authority.
 * @param name - Control word or control symbol without the backslash.
 * @param start - Offset of the backslash.
 * @returns Complete expression; unknown commands fail the whole parse.
 */
export function parseMathCommand(parser: MathStructureParser, name: string, start: number): MathExpression {
  if (Object.hasOwn(mathFractionCommands, name)) return parseMathFraction(parser, name, start);
  if (name === 'sqrt') return parseMathRadical(parser, start);
  if (name === 'left') return parseMathFence(parser, start);
  if (name === 'begin') return parseMathMatrix(parser, start);
  if (name === 'substack') return parseMathSubstack(parser, start);
  if (Object.hasOwn(mathOperatorCommands, name) || mathFunctionCommands.includes(name as never)) return parseMathOperator(parser, name, start);
  if (Object.hasOwn(mathAccentCommands, name)) return parseMathAccent(parser, name, start);
  if (Object.hasOwn(mathStyleVariants, name)) return parseMathStyled(parser, name, start);
  if (Object.hasOwn(mathTextVariants, name)) return parseMathText(parser, name, start);
  if (name === 'right') return parser.reader.fail('unexpected-token', 'Unmatched \\right.', start);
  return parseMathToken(parser, name, start);
}
