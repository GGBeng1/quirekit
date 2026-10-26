import { defineMathTemplate as t } from '../factory';

/** Basic structures, with the seven original identities retained. */
export const basicMathTemplates = [
  t('fraction', '分数', 'Fraction', 'basic', String.raw`\frac{◊}{}`, ['fraction', '分子', '分母']),
  t('square-root', '平方根', 'Square root', 'basic', String.raw`\sqrt{◊}`, ['root', 'sqrt', '根式']),
  t('cube-root', '立方根', 'Cube root', 'basic', String.raw`\sqrt[3]{◊}`, ['root', '根式']),
  { ...t('superscript', '上标', 'Superscript', 'basic', '{◊}^{}', ['power', '幂']), capturePrevious: true, scripts: { superscript: '' } },
  { ...t('subscript', '下标', 'Subscript', 'basic', '{◊}_{}', ['subscript', '脚标']), capturePrevious: true, scripts: { subscript: '' } },
  { ...t('square', '平方', 'Square', 'basic', '{◊}^{2}', ['square', 'power', '二次方']), capturePrevious: true, scripts: { superscript: '2' }, completes: true },
  { ...t('cube', '立方', 'Cube', 'basic', '{◊}^{3}', ['cube', 'power', '三次方']), capturePrevious: true, scripts: { superscript: '3' }, completes: true },
  t('nth-root', '任意次根', 'Nth root', 'basic', String.raw`\sqrt[]{◊}`, ['root', '根指数', '开方']),
  { ...t('subsuperscript', '上下标', 'Subscript and superscript', 'basic', '{◊}_{}^{}', ['幂', '脚标']), capturePrevious: true, scripts: { subscript: '', superscript: '' } },
  t('reciprocal', '倒数', 'Reciprocal', 'basic', String.raw`\frac{1}{◊}`),
  t('derivative', '导数', 'Derivative', 'calculus', String.raw`\frac{d{◊}}{dx}`, ['微分', 'derivative', 'differential']),
  t('partial-derivative', '偏导数', 'Partial derivative', 'calculus', String.raw`\frac{\partial{◊}}{\partial x}`, ['偏微分', 'partial']),
  t('second-derivative', '二阶导数', 'Second derivative', 'calculus', String.raw`\frac{d^{2}{◊}}{dx^{2}}`, ['导数', 'differential']),
];
