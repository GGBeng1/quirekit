import type { MathAccent, MathAccentName, MathSequence } from '../../model/types';
import { mathAnnotationFirstAccents, mathExtensibleArrows } from '../commands';
import type { MathStructureParser } from '../types';

/**
 * Parses a fixed accent, annotation or extensible arrow without guessing arbitrary commands.
 * @param parser - Recursive argument authority.
 * @param command - Admitted accent command.
 * @param start - Original command offset.
 * @returns Complete accent.
 */
export function parseMathAccent(parser: MathStructureParser, command: string, start: number): MathAccent {
  const { reader } = parser;
  const name = command as MathAccentName;
  let annotation: MathSequence | undefined;
  let content: MathSequence;
  if (mathExtensibleArrows.has(name)) {
    // `\xrightarrow[below]{above}`: the required argument is the editable content above the arrow.
    annotation = parser.optional();
    content = parser.argument(true);
  } else if (mathAnnotationFirstAccents.has(name)) {
    annotation = parser.argument();
    content = parser.argument();
  } else {
    content = parser.argument();
    reader.whitespace();
    const script = name === 'overbrace' ? '^' : name === 'underbrace' ? '_' : undefined;
    if (script && reader.source[reader.offset] === script) {
      reader.offset++;
      annotation = parser.argument();
    }
  }
  return { kind: 'accent', name, content, ...(annotation ? { annotation } : {}), source: { start, end: reader.offset } };
}
