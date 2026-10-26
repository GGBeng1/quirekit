import type { MathMatrixEnvironment } from '../model/types';
import { defineMathTemplate } from './factory';
import type { MathTemplate } from './types';

const names: Readonly<Partial<Record<MathMatrixEnvironment, readonly [string, string]>>> = Object.freeze({
  matrix: ['无括号矩阵', 'Matrix'], pmatrix: ['圆括号矩阵', 'Parenthesized matrix'],
  bmatrix: ['方括号矩阵', 'Bracketed matrix'], Bmatrix: ['花括号矩阵', 'Braced matrix'],
  vmatrix: ['行列式', 'Determinant'], Vmatrix: ['双竖线矩阵', 'Double-bar matrix'], cases: ['分段函数', 'Piecewise function'],
});
/**
 * Creates one bounded rectangular authoring template with a selection in its first cell.
 * @param environment - Matrix or cases environment; other environments return null.
 * @param rows - Integer row count, one through eight.
 * @param columns - Integer column count, one through eight; cases require two.
 * @returns Complete atomic template or null for invalid dimensions.
 */
export function createMathMatrixTemplate(environment: MathMatrixEnvironment, rows: number, columns: number): MathTemplate | null {
  const name = names[environment];
  if (!name || !Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || rows > 8 || columns < 1 || columns > 8 || environment === 'cases' && columns !== 2) return null;
  const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) => !r && !c ? '◊' : '').join('&')).join('\\\\');
  return defineMathTemplate(`matrix-${environment}`, name[0], name[1], 'matrix', `\\begin{${environment}}${cells}\\end{${environment}}`, ['matrix', '矩阵', '数组', '行列式', '分段', environment]);
}
/** All admitted matrix shapes default to two rows and two columns. */
export const matrixMathTemplates = Object.keys(names).map(name => createMathMatrixTemplate(name as MathMatrixEnvironment, 2, 2)!);
