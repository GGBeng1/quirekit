import type { MathSlotLabels, MathVisualSlot } from './types';

/** Default Chinese accessible names; consumers pass their own table for other languages. */
export const mathSlotLabelsZh: MathSlotLabels = Object.freeze({
  root: '公式', group: '分组', numerator: '分子', denominator: '分母', degree: '根指数', radicand: '根式内容',
  base: '底数', subscript: '下标', superscript: '上标', functionSubscript: '函数下标', functionSuperscript: '函数上标',
  argument: '函数参数', lower: '下限', upper: '上限', body: '运算内容', fenceContent: '括号内容',
  accentContent: '重音内容', annotation: '注释', styledContent: '样式内容', textFormula: '文本内公式',
  cell: (row: number, column: number) => `第 ${row + 1} 行第 ${column + 1} 列`,
});
/** English accessible names. */
export const mathSlotLabelsEn: MathSlotLabels = Object.freeze({
  root: 'Formula', group: 'Group', numerator: 'Numerator', denominator: 'Denominator', degree: 'Root index', radicand: 'Radicand',
  base: 'Base', subscript: 'Subscript', superscript: 'Superscript', functionSubscript: 'Function subscript', functionSuperscript: 'Function superscript',
  argument: 'Function argument', lower: 'Lower limit', upper: 'Upper limit', body: 'Operand', fenceContent: 'Bracket content',
  accentContent: 'Accented content', annotation: 'Annotation', styledContent: 'Styled content', textFormula: 'Formula in text',
  cell: (row: number, column: number) => `Row ${row + 1}, column ${column + 1}`,
});

/**
 * Names a slot for accessibility from its structural role and owner.
 * @param slot - Structural slot.
 * @param labels - Language table; Chinese by default.
 * @returns Accessible name.
 */
export function formatMathSlotLabel(slot: Pick<MathVisualSlot, 'role' | 'owner'>, labels: MathSlotLabels = mathSlotLabelsZh): string {
  const cell = /^cell-(\d+)-(\d+)$/u.exec(slot.role);
  if (cell) return labels.cell(Number(cell[1]), Number(cell[2]));
  if (slot.role.startsWith('math-')) return labels.textFormula;
  if (slot.owner === 'function' && slot.role === 'subscript') return labels.functionSubscript;
  if (slot.owner === 'function' && slot.role === 'superscript') return labels.functionSuperscript;
  if (slot.role === 'content') return slot.owner === 'fence' ? labels.fenceContent : slot.owner === 'styled' ? labels.styledContent : labels.accentContent;
  const key = slot.role as Exclude<keyof MathSlotLabels, 'cell'>;
  return typeof labels[key] === 'string' ? labels[key] : slot.role;
}
