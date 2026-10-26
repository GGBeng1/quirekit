import { getMathVisualSlots } from '@quirekit/math';
import type { MathDocument, MathLayoutRect, MathSlotGeometry } from '@quirekit/math';
import type { FormulaAdaptor, FormulaElement, FormulaWrapper } from '../engine/types';
import { formulaPoint, formulaTransform } from './transform';

/**
 * Reads layout boxes and zero-ink boundaries before releasing the engine wrappers.
 * @param root - Exact wrapper tree used for the SVG output.
 * @param svg - SVG coordinate owner.
 * @param adaptor - Matching engine DOM adaptor.
 * @param document - Matching admitted structure and ownership paths.
 * @returns Immutable slot geometry in formula-local em units.
 */
export function formulaSlots(root: FormulaWrapper, svg: FormulaElement, adaptor: FormulaAdaptor, document: MathDocument): readonly MathSlotGeometry[] {
  const viewBox = adaptor.getAttribute(svg, 'viewBox').split(/\s+/u).map(Number);
  const source = new Map(getMathVisualSlots(document).map(slot => [slot.id, slot]));
  const result: MathSlotGeometry[] = [];
  /**
   * Projects a logical box rather than attempting to measure glyph ink.
   * @param wrapper - Placed argument, child or zero-width boundary.
   * @returns Matching top-left em rectangle.
   */
  function rect(wrapper: FormulaWrapper): MathLayoutRect {
    const element = wrapper.dom?.[0];
    if (!element) throw new Error('Missing formula layout anchor');
    const bbox = wrapper.getBBox();
    const matrix = formulaTransform(element, svg, adaptor);
    const points = [[0, -bbox.d], [bbox.w, -bbox.d], [0, bbox.h], [bbox.w, bbox.h]].map(([x, y]) => formulaPoint(matrix, x! * 1000, y! * 1000));
    const xs = points.map(point => point[0]);
    const ys = points.map(point => point[1]);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return Object.freeze({ left: (left - viewBox[0]!) / 1000, top: (top - viewBox[1]!) / 1000, width: (Math.max(...xs) - left) / 1000, height: (Math.max(...ys) - top) / 1000 });
  }
  /**
   * Reads only controlled editing identities on emitted groups.
   * @param wrapper - One placed mathematical wrapper.
   * @param name - Controlled projection attribute.
   * @returns Attribute value, absent when this wrapper has no matching group.
   */
  function attribute(wrapper: FormulaWrapper, name: string): string | undefined {
    return wrapper.dom?.[0] ? adaptor.getAttribute(wrapper.dom[0], name) : undefined;
  }
  /**
   * Collects source-ordered slots using the wrapper ownership tree.
   * @param wrapper - Current wrapper from the completed layout.
   */
  function visit(wrapper: FormulaWrapper): void {
    const id = attribute(wrapper, 'data-math-slot');
    if (id !== undefined && source.has(id)) {
      const children = wrapper.childNodes.filter(child => attribute(child, 'data-math-node-index') !== undefined).map(rect);
      const boundaries = wrapper.childNodes.filter(child => attribute(child, 'data-math-boundary') !== undefined).map(child => rect(child).left);
      const placeholder = wrapper.childNodes.find(child => attribute(child, 'data-math-placeholder') !== undefined);
      const empty = placeholder ? rect(placeholder) : undefined;
      const parent = source.get(id)!.parent;
      if (children.length !== source.get(id)!.sequence.children.length || boundaries.length !== children.length + 1) throw new Error(`Incomplete formula geometry: ${id}`);
      result.push(Object.freeze({ id, rect: rect(wrapper), children: Object.freeze(children), boundaries: Object.freeze(boundaries), ...(empty ? { emptyCenter: empty.left + empty.width / 2 } : {}), ...(parent ? { parent: Object.freeze({ ...parent }) } : {}) }));
    }
    wrapper.childNodes.forEach(visit);
  }
  // Publish geometry only after the engine has placed every child; SVG and metrics stay atomic.
  visit(root);
  if (result.length !== source.size) throw new Error('Incomplete formula slot coverage');
  const byId = new Map(result.map(slot => [slot.id, slot]));
  return Object.freeze([...source.keys()].map(id => byId.get(id)!));
}
