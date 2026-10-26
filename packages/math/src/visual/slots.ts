import type { MathDocument, MathExpression, MathSequence } from '../model/types';
import type { MathCaret, MathChildSpan, MathSlotChild, MathVisualSlot } from './types';

/**
 * Lists optional script roles in reading order.
 * @param subscript - Lower script or limit.
 * @param superscript - Upper script or limit.
 * @param names - Role names for the lower and upper argument.
 * @returns Present roles only.
 */
function scriptRoles(subscript: MathSequence | undefined, superscript: MathSequence | undefined, names: readonly [string, string]): MathSlotChild[] {
  return [
    ...(subscript ? [{ role: names[0], expression: subscript }] : []),
    ...(superscript ? [{ role: names[1], expression: superscript }] : []),
  ];
}

/**
 * Gets nested editable arguments in mathematical reading order.
 * @param expression - Owning structure.
 * @returns Explicit argument roles.
 */
export function mathSlotChildren(expression: MathExpression): readonly MathSlotChild[] {
  switch (expression.kind) {
    case 'fraction': return [{ role: 'numerator', expression: expression.numerator }, { role: 'denominator', expression: expression.denominator }];
    case 'radical': return [...(expression.degree ? [{ role: 'degree', expression: expression.degree }] : []), { role: 'radicand', expression: expression.radicand }];
    case 'scripts': return [{ role: 'base', expression: expression.base }, ...scriptRoles(expression.subscript, expression.superscript, ['subscript', 'superscript'])];
    case 'operator': return [...scriptRoles(expression.lower, expression.upper, ['lower', 'upper']), ...(expression.body ? [{ role: 'body', expression: expression.body }] : [])];
    case 'function': return [...scriptRoles(expression.subscript, expression.superscript, ['subscript', 'superscript']), ...(expression.argument ? [{ role: 'argument', expression: expression.argument }] : [])];
    case 'fence': return [{ role: 'content', expression: expression.content }];
    case 'accent': return [{ role: 'content', expression: expression.content }, ...(expression.annotation ? [{ role: 'annotation', expression: expression.annotation }] : [])];
    case 'matrix': return expression.rows.flatMap((row, r) => row.map((cell, c) => ({ role: `cell-${r}-${c}`, expression: cell })));
    case 'styled': return [{ role: 'content', expression: expression.content }];
    case 'text': return expression.parts.flatMap((part, index) => part.kind === 'sequence' ? [{ role: `math-${index}`, expression: part }] : []);
    case 'sequence': return [{ role: 'group', expression }];
    case 'symbol':
    case 'space':
    case 'delimiter':
    case 'switch':
    case 'marker': return [];
  }
}
/**
 * Projects parsed sequences into syntax-safe editable slots.
 * @param document - Complete supported source and AST.
 * @returns Slots in depth-first mathematical reading order.
 */
export function getMathVisualSlots(document: MathDocument): readonly MathVisualSlot[] {
  const slots: MathVisualSlot[] = [];
  /**
   * Visits one role while retaining the owning structural boundary.
   * @param sequence - Editable sequence.
   * @param id - Structural path.
   * @param role - Structural role.
   * @param owner - Owning expression kind.
   * @param parent - Owning child boundary.
   */
  function visit(sequence: MathSequence, id: string, role: string, owner?: MathExpression['kind'], parent?: MathCaret): void {
    const { start, end } = sequence.source;
    const delimited = sequence.boundary === 'brace' || sequence.boundary === 'bracket';
    slots.push({ id, role, ...(owner ? { owner } : {}), sequence, from: start, to: delimited ? end - 1 : end, wrap: !!parent && !sequence.boundary, ...(parent ? { parent } : {}) });
    sequence.children.forEach((expression, index) => {
      for (const child of mathSlotChildren(expression)) {
        const nested: MathSequence = child.expression.kind === 'sequence' ? child.expression : { kind: 'sequence', children: [child.expression], source: child.expression.source };
        visit(nested, `${id}/${index}/${child.role}`, child.role, expression.kind, { slot: id, index });
      }
    });
  }
  visit(document.root, 'root', 'root');
  return slots;
}
/**
 * Includes grouping syntax when selecting or deleting a complete child.
 * @param expression - Child expression.
 * @param source - Exact author source.
 * @returns Whole-child source span.
 */
export function mathChildSpan(expression: MathExpression, source: string): MathChildSpan {
  const { start, end } = expression.source;
  const grouped = (expression.kind === 'sequence' || expression.kind === 'scripts' && expression.base.kind === 'sequence') && source[start - 1] === '{';
  return { from: grouped ? start - 1 : start, to: end };
}
/**
 * Finds the deepest editable boundary matching a generated source caret.
 * @param document - Reparsed edit result.
 * @param offset - Desired UTF-16 boundary.
 * @returns Syntax-safe internal caret.
 */
export function mathCaretAtSource(document: MathDocument, offset: number): MathCaret {
  const slots = getMathVisualSlots(document);
  const slot = [...slots].reverse().find(item => offset >= item.from && offset <= item.to) ?? slots[0]!;
  const index = slot.sequence.children.findIndex(child => mathChildSpan(child, document.latex).to > offset);
  return { slot: slot.id, index: index < 0 ? slot.sequence.children.length : index };
}
