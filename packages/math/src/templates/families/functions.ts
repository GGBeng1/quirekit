import { defineMathTemplate as t } from '../factory';

const names = [
  ['sin', '正弦', 'Sine'], ['cos', '余弦', 'Cosine'], ['tan', '正切', 'Tangent'],
  ['cot', '余切', 'Cotangent'], ['sec', '正割', 'Secant'], ['csc', '余割', 'Cosecant'],
  ['arcsin', '反正弦', 'Arcsine'], ['arccos', '反余弦', 'Arccosine'], ['arctan', '反正切', 'Arctangent'],
  ['sinh', '双曲正弦', 'Hyperbolic sine'], ['cosh', '双曲余弦', 'Hyperbolic cosine'],
  ['tanh', '双曲正切', 'Hyperbolic tangent'], ['coth', '双曲余切', 'Hyperbolic cotangent'],
  ['sech', '双曲正割', 'Hyperbolic secant'], ['csch', '双曲余割', 'Hyperbolic cosecant'],
  ['log', '对数', 'Logarithm'], ['ln', '自然对数', 'Natural logarithm'],
  ['lg', '常用对数', 'Common logarithm'], ['exp', '指数函数', 'Exponential'],
] as const;
/** Function names remain upright while argument and script slots stay editable. */
export const functionMathTemplates = [
  ...names.map(([command, label, english]) => t(`function-${command}`, label, english, 'functions', `\\${command}{◊}`, [command, '函数', 'function'])),
  ...names.slice(0, 6).map(([command, label, english]) => t(`function-${command}-inverse`, `${label}逆函数`, `Inverse ${english}`, 'functions', `\\${command}^{-1}{◊}`, [command, '反函数', 'inverse'])),
  t('function-sin-square', '正弦平方', 'Sine squared', 'functions', String.raw`\sin^{2}{◊}`, ['sin', '幂']),
  t('function-cos-square', '余弦平方', 'Cosine squared', 'functions', String.raw`\cos^{2}{◊}`, ['cos', '幂']),
  t('log-base', '任意底对数', 'Logarithm with base', 'functions', String.raw`\log_{}{◊}`, ['log', '对数', 'base']),
];
