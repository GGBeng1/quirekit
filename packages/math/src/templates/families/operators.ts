import { defineMathTemplate as t } from '../factory';

const integrals = [
  ['int', 'integral', '积分', 'Integral'], ['iint', 'double-integral', '二重积分', 'Double integral'],
  ['iiint', 'triple-integral', '三重积分', 'Triple integral'], ['oint', 'contour-integral', '环路积分', 'Contour integral'],
  ['oiint', 'surface-integral', '曲面积分', 'Surface integral'], ['oiiint', 'volume-integral', '闭合体积分', 'Closed volume integral'],
] as const;
const operators = [
  ['sum', 'summation', '求和', 'Summation'], ['prod', 'product', '连乘', 'Product'],
  ['coprod', 'coproduct', '余积', 'Coproduct'], ['bigcup', 'big-union', '大型并集', 'Big union'],
  ['bigcap', 'big-intersection', '大型交集', 'Big intersection'],
  ['bigvee', 'big-disjunction', '大型逻辑或', 'Big disjunction'], ['bigwedge', 'big-conjunction', '大型逻辑与', 'Big conjunction'],
] as const;
/** Operators own editable bounds and operands, with complete atomic variants. */
export const operatorMathTemplates = [
  ...integrals.flatMap(([command, id, label, english]) => [
    t(id, label, english, 'calculus', `\\${command}{◊}`, ['积分', command, 'integral', '∫']),
    t(id === 'integral' ? 'definite-integral' : `bounded-${id}`, `${label === '积分' ? '定积分' : label + '（上下限）'}`, `Definite ${english}`, 'calculus', `\\${command}_{}^{}{◊}`, ['定积分', '上下限', command, 'integral', '∫']),
    t(`${id}-limits`, `${label}（上下限居中）`, `${english} with stacked limits`, 'calculus', `\\${command}\\limits_{}^{}{◊}`, ['积分', '上下限', 'limits', command]),
  ]),
  ...operators.flatMap(([command, id, label, english]) => [
    t(id, label, english, 'operators', `\\${command}_{}^{}{◊}`, ['数列', command, '大型运算', '∑', 'Σ']),
    t(`${id}-bare`, `${label}（无上下限）`, `${english} without limits`, 'operators', `\\${command}{◊}`, [command, '大型运算']),
  ]),
  t('summation-side', '求和（侧置上下限）', 'Summation with side limits', 'operators', String.raw`\sum\nolimits_{}^{}{◊}`, ['sum', '求和']),
  t('product-side', '连乘（侧置上下限）', 'Product with side limits', 'operators', String.raw`\prod\nolimits_{}^{}{◊}`, ['prod', '连乘']),
  t('limit', '极限', 'Limit', 'calculus', String.raw`\lim_{}{◊}`, ['lim', 'limit']),
  t('limit-zero', '趋于零的极限', 'Limit at zero', 'calculus', String.raw`\lim_{x\to0}{◊}`, ['lim', '极限']),
  t('maximum', '最大值', 'Maximum', 'operators', String.raw`\max_{}{◊}`, ['max', '极值']),
  t('minimum', '最小值', 'Minimum', 'operators', String.raw`\min_{}{◊}`, ['min', '极值']),
];
