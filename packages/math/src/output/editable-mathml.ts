import type { MathDocument, MathExpression } from '../model/types';
import { formatMathSlotLabel } from '../visual/labels';
import { getMathVisualSlots } from '../visual/slots';
import type { MathSlotLabels, MathVisualSelection } from '../visual/types';
import { mathSwitchBefore, styledByMathSwitch } from './families';
import { renderMathStructure } from './structure';
import { escapeXml } from './xml';

/**
 * Emits an editable MathML projection with structural caret and empty slots.
 * @param document - Valid formula with original source.
 * @param selection - Current structural endpoints.
 * @param focused - Whether the owning input has focus.
 * @param labels - Accessible slot names; Chinese by default.
 * @returns Safe MathML with stable structural paths and hit targets.
 */
export function renderEditableMathML(document: MathDocument, selection: MathVisualSelection, focused = true, labels?: MathSlotLabels): string {
  const slots = new Map(getMathVisualSlots(document).map(slot => [slot.id, slot]));
  /**
   * Projects a slot and its child boundaries without exposing syntax tokens.
   * @param id - Structural slot path.
   * @returns MathML for the slot, caret, and placeholder.
   */
  function slotMarkup(id: string): string {
    const slot = slots.get(id)!;
    const active = selection.focus.slot === id;
    const low = Math.min(selection.focus.index, selection.anchor?.index ?? selection.focus.index);
    const high = Math.max(selection.focus.index, selection.anchor?.index ?? selection.focus.index);
    const { children } = slot.sequence;
    const items = children.map((expression, index) => {
      const selected = active && index >= low && index < high ? ' data-math-selected="true"' : '';
      // A style switch applies inside each following child, keeping every child a direct slot member.
      const content = styledByMathSwitch(mathSwitchBefore(children, index), expressionMarkup(expression, `${id}/${index}`));
      return `${caret(id, index)}<mrow data-math-owner="${id}" data-math-node-index="${index}"${selected}>${content}</mrow>`;
    });
    const label = escapeXml(formatMathSlotLabel(slot, labels));
    const placeholder = children.length ? '' : '<mtext data-math-placeholder="true">□</mtext>';
    return `<mrow data-math-slot="${id}" aria-label="${label}"${active && focused ? ' data-math-active-slot="true"' : ''}>${items.join('')}${caret(id, children.length)}${placeholder}</mrow>`;
  }
  /**
   * Marks every child boundary without affecting mathematical layout.
   * @param id - Owning slot.
   * @param index - Child boundary.
   * @returns Zero-metric boundary with an optional active marker.
   */
  function caret(id: string, index: number): string {
    const active = focused && selection.focus.slot === id && selection.focus.index === index;
    return `<mspace data-math-boundary="true"${active ? ' data-math-caret="true"' : ''} width="0px" height="0px" depth="0px" />`;
  }
  /**
   * Maps admitted structures onto editable argument slots.
   * @param expression - Complete expression.
   * @param path - Owning child path.
   * @returns Structural MathML.
   */
  function expressionMarkup(expression: MathExpression, path: string): string {
    return renderMathStructure(expression, role => slotMarkup(`${path}/${role}`));
  }
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${slotMarkup('root')}</math>`;
}
