import type { MathFormulaLayout, MathLayoutRect } from '../output/layout/types';
import type { MathGeometryProjection, MathSurfaceRect, MathSurfaceSlot } from './types';

/**
 * Projects retained logical boxes without measuring individual glyphs or painting UI.
 * @param layout - Graphic and em geometry from the same conversion.
 * @param projection - Consumer-owned surface origin and scale.
 * @returns Complete slot geometry in surface content pixels.
 */
export function projectMathGeometry(layout: MathFormulaLayout, projection: MathGeometryProjection): readonly MathSurfaceSlot[] {
  const { left, top, scaleX } = projection; const scaleY = projection.scaleY ?? scaleX;
  if (![left, top, scaleX, scaleY].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) return [];
  /**
   * Projects one logical rectangle using the explicit coordinate contract.
   * @param value - Formula-local em box.
   * @returns Consumer surface box.
   */
  function rect(value: MathLayoutRect): MathSurfaceRect {
    return { left: left + value.left * scaleX, top: top + value.top * scaleY, width: value.width * scaleX, height: value.height * scaleY };
  }
  return layout.slots.map(slot => ({
    id: slot.id, rect: rect(slot.rect), children: slot.children.map(rect), boundaries: slot.boundaries.map(value => left + value * scaleX),
    ...(slot.emptyCenter === undefined ? {} : { emptyCenter: left + slot.emptyCenter * scaleX }), ...(slot.parent ? { parent: slot.parent } : {}),
  }));
}
