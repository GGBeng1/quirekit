import { defineMathTemplate as t } from '../factory';

const accents = [
  ['hat', '帽子重音', 'Hat'], ['widehat', '宽帽子重音', 'Wide hat'], ['check', '倒帽重音', 'Check'],
  ['grave', '抑音重音', 'Grave'], ['acute', '锐音重音', 'Acute'], ['tilde', '波浪重音', 'Tilde'],
  ['widetilde', '宽波浪重音', 'Wide tilde'], ['breve', '短音重音', 'Breve'], ['bar', '短横重音', 'Bar'],
  ['overline', '上横线', 'Overline'], ['underline', '下划线', 'Underline'], ['vec', '向量', 'Vector'],
  ['overrightarrow', '右箭头重音', 'Right arrow'], ['overleftarrow', '左箭头重音', 'Left arrow'],
  ['overleftrightarrow', '双向箭头重音', 'Bidirectional arrow'],
  ['dot', '一阶点导数', 'Dot derivative'], ['ddot', '二阶点导数', 'Double dot derivative'],
  ['overbrace', '上括弧', 'Overbrace'], ['underbrace', '下括弧', 'Underbrace'],
] as const;
const fences = [
  ['parentheses', '圆括号', 'Parentheses', '(', ')'], ['brackets', '方括号', 'Brackets', '[', ']'],
  ['braces', '花括号', 'Braces', '\\{', '\\}'], ['absolute-value', '绝对值', 'Absolute value', '|', '|'],
  ['norm', '范数', 'Norm', '\\Vert', '\\Vert'], ['angle-brackets', '尖括号', 'Angle brackets', '\\langle', '\\rangle'],
  ['floor', '向下取整', 'Floor', '\\lfloor', '\\rfloor'], ['ceiling', '向上取整', 'Ceiling', '\\lceil', '\\rceil'],
] as const;
/** Stretchable decoration families, including editable brace annotations. */
export const decorationMathTemplates = [
  ...accents.map(([command, label, english]) => t(command, label, english, 'accents', `\\${command}{◊}`, [command, '重音', 'accent'])),
  t('annotated-overbrace', '带注释上括弧', 'Annotated overbrace', 'accents', String.raw`\overbrace{◊}^{}`, ['overbrace', '注释']),
  t('annotated-underbrace', '带注释下括弧', 'Annotated underbrace', 'accents', String.raw`\underbrace{◊}_{}`, ['underbrace', '注释']),
  t('overset', '上方注释', 'Overset', 'accents', String.raw`\overset{}{◊}`, ['overset', '注释']),
  t('underset', '下方注释', 'Underset', 'accents', String.raw`\underset{}{◊}`, ['underset', '注释']),
  ...fences.map(([id, label, english, left, right]) => t(id, label, english, 'delimiters', `\\left${left}{◊}\\right${right}`, [id, '括号', 'delimiter'])),
];
