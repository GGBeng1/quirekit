import { getMathVisualSlots } from '../visual/slots';
import { parseMathLatex } from '../latex/parse';
import type { MathDocument } from '../model/types';
import type { MathTemplate } from '../templates/types';
import type { MathVisualSlot } from '../visual/types';

/**
 * Chooses illustrative parameters without changing the empty authoring template.
 * @param slot - One empty syntax-safe argument in the preview source.
 * @param document - Parsed template providing the owning structure.
 * @param slots - Complete bounded role index.
 * @param template - Catalog identity and optional authored illustration.
 * @returns Valid admitted example source for this argument.
 */
function parameter(slot: MathVisualSlot, document: MathDocument, slots: ReadonlyMap<string, MathVisualSlot>, template: MathTemplate): string {
  const role = slot.id.split('/').at(-1);
  const owner = slot.parent ? slots.get(slot.parent.slot)?.sequence.children[slot.parent.index] : document.root;
  if (owner?.kind === 'matrix') {
    const [, row, column] = role!.split('-');
    const r = Number(row); const c = Number(column);
    if (owner.environment === 'cases') return c ? r ? 'x<0' : String.raw`x\ge0` : r ? '-x' : 'x';
    return owner.rows.length === 2 && owner.rows[0]!.length === 2 ? ['a', 'b', 'c', 'd'][r * 2 + c]! : `a_{${r + 1}${c + 1}}`;
  }
  if (owner?.kind === 'operator') {
    const integral = owner.name.includes('int');
    if (role === 'lower') return owner.name === 'lim' ? String.raw`x\to0` : integral ? '0' : 'i=1';
    if (role === 'upper') return integral ? '1' : 'n';
    return integral || owner.name === 'lim' ? 'f(x)' : 'a_i';
  }
  if (role === 'numerator') return 'a';
  if (role === 'denominator') return 'b';
  if (role === 'degree' || role === 'superscript' || role === 'annotation') return 'n';
  if (role === 'subscript') return owner?.kind === 'function' ? 'b' : 'i';
  if (owner?.kind === 'accent' && ['widehat', 'widetilde', 'overbrace', 'underbrace', 'overline', 'underline'].includes(owner.name)) return 'a+b';
  if (template.id.includes('derivative')) return 'f(x)';
  return 'x';
}

/**
 * Admits a complete illustration independently of the chosen rendering backend.
 * @param source - Supported literal example source.
 * @returns Exact supported preview document with no editor placeholder boxes.
 */
export function createMathPreview(source: string): MathDocument {
  const parsed = parseMathLatex(source);
  if (!parsed.ok) throw new Error(`Invalid formula preview: ${parsed.diagnostic.message}`);
  return parsed.document;
}

/**
 * Fills only preview roles, validating the illustration independently of insertion.
 * @param template - Unmodified admitted authoring template.
 * @returns Safe complete preview; insertion still consumes the original template.
 */
export function createMathTemplatePreview(template: MathTemplate): MathDocument {
  if (template.preview) return createMathPreview(template.preview);
  let source = template.pattern.replace('◊', '');
  const parsed = parseMathLatex(source);
  if (!parsed.ok) throw new Error(`Invalid formula template: ${template.id}`);
  const slots = getMathVisualSlots(parsed.document);
  const index = new Map(slots.map(slot => [slot.id, slot]));
  // Source spans belong to the original template; reverse splices preserve every later boundary.
  for (const slot of slots.filter(item => !item.sequence.children.length).sort((a, b) => b.from - a.from)) {
    const value = parameter(slot, parsed.document, index, template);
    source = source.slice(0, slot.from) + (slot.wrap ? `{${value}}` : value) + source.slice(slot.to);
  }
  return createMathPreview(source);
}
