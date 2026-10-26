import type { FormulaAdaptor, FormulaElement } from '../engine/types';
import type { FormulaTransform } from './types';

const identity: FormulaTransform = [1, 0, 0, 1, 0, 0];

/**
 * Composes SVG matrices in the same order as the owning nested groups.
 * @param outer - Parent transform.
 * @param inner - Child transform.
 * @returns Combined local-to-parent matrix.
 */
function multiply(outer: FormulaTransform, inner: FormulaTransform): FormulaTransform {
  const [a, b, c, d, e, f] = outer;
  const [u, v, w, x, y, z] = inner;
  return [a * u + c * v, b * u + d * v, a * w + c * x, b * w + d * x, a * y + c * z + e, b * y + d * z + f];
}

/**
 * Decodes the transforms emitted by the pinned SVG output backend.
 * @param value - SVG group transform list.
 * @returns Local-to-parent affine matrix.
 */
function parse(value: string): FormulaTransform {
  let result = identity;
  for (const match of value.matchAll(/(translate|scale|matrix)\s*\(([^)]*)\)/gu)) {
    const values = match[2]!.trim().split(/[\s,]+/u).map(Number);
    if (!values.every(Number.isFinite)) throw new Error('Invalid formula transform');
    if (match[1] === 'matrix' ? values.length !== 6 : values.length < 1 || values.length > 2) throw new Error('Invalid formula transform arity');
    const [x = 0, y] = values;
    const next: FormulaTransform = match[1] === 'translate' ? [1, 0, 0, 1, x, y ?? 0]
      : match[1] === 'scale' ? [x, 0, 0, y ?? x, 0, 0]
        : values as unknown as FormulaTransform;
    result = multiply(result, next);
  }
  if (value.replace(/(translate|scale|matrix)\s*\([^)]*\)/gu, '').trim()) throw new Error('Unsupported formula transform');
  return result;
}

/**
 * Projects wrapper metrics through actual SVG placement, including script scaling.
 * @param node - Group corresponding to one mathematical wrapper.
 * @param svg - Root SVG coordinate owner.
 * @param adaptor - Matching isolated DOM adaptor.
 * @returns Local wrapper-to-viewBox transform.
 */
export function formulaTransform(node: FormulaElement, svg: FormulaElement, adaptor: FormulaAdaptor): FormulaTransform {
  let result = identity;
  let current: FormulaElement | null = node;
  while (current && current !== svg) {
    result = multiply(parse(adaptor.getAttribute(current, 'transform') ?? ''), result);
    current = adaptor.parent(current);
  }
  if (current !== svg) throw new Error('Formula geometry does not belong to its SVG');
  return result;
}

/**
 * Applies a local-to-viewBox transform to one logical point.
 * @param matrix - Composed SVG group placement.
 * @param x - Mathematical horizontal coordinate.
 * @param y - Mathematical vertical coordinate.
 * @returns Point in root SVG coordinates.
 */
export function formulaPoint(matrix: FormulaTransform, x: number, y: number): readonly [number, number] {
  return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}
