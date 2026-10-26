import type { MathScripts, MathSequence } from '../../model/types';
import type { MathStructureParser } from '../types';

/**
 * Reads postfix script arguments while rejecting duplicate roles atomically.
 * @param parser - Recursive argument and exact source authority.
 * @returns Optional script roles.
 */
export function parseMathScripts(parser: MathStructureParser): Pick<MathScripts, 'subscript' | 'superscript'> {
  const { reader } = parser;
  const scripts: { subscript?: MathSequence; superscript?: MathSequence } = {};
  while (true) {
    reader.whitespace();
    const token = reader.source[reader.offset];
    if (token !== '^' && token !== '_') break;
    const role = token === '^' ? 'superscript' : 'subscript';
    if (scripts[role]) reader.fail('duplicate-script', 'Repeated script on the same base.');
    reader.offset++;
    scripts[role] = parser.argument();
  }
  return scripts;
}
