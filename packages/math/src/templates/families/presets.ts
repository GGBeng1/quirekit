import { defineMathTemplate as t } from '../factory';

/** Sequence presets expose familiar editable parameters without requiring source syntax. */
export const sequenceMathTemplates = [
  { ...t('arithmetic-sequence', '等差数列通项', 'Arithmetic sequence', 'sequences', 'a_n=a_1+(n-1){◊}', ['数列', '等差', 'sequence', 'progression']), preview: 'a_n=a_1+(n-1)d' },
  { ...t('geometric-sequence', '等比数列通项', 'Geometric sequence', 'sequences', 'a_n=a_1{◊}^{n-1}', ['数列', '等比', 'sequence', 'progression']), preview: 'a_n=a_1q^{n-1}' },
  t('arithmetic-series', '等差数列求和', 'Arithmetic series', 'sequences', String.raw`S_n=\frac{n(a_1+a_n)}{2}◊`, ['数列', '求和', 'series']),
  t('geometric-series', '等比数列求和', 'Geometric series', 'sequences', String.raw`S_n=\frac{a_1(1-q^{n})}{1-q}◊`, ['数列', '求和', 'series']),
  t('sequence-sum', '数列求和', 'Finite sequence sum', 'sequences', String.raw`S_n=\sum_{k=1}^{n}{a_k}◊`, ['数列', '求和', 'sum', 'series']),
  t('infinite-series', '无穷级数', 'Infinite series', 'sequences', String.raw`\sum_{n=1}^{\infty}{a_n}◊`, ['数列', '级数', 'series']),
  { ...t('recurrence', '递推数列', 'Recurrence relation', 'sequences', 'a_{n+1}={◊}a_n+b', ['数列', '递推', 'recurrence']), preview: 'a_{n+1}=qa_n+b' },
  t('fibonacci', '斐波那契递推', 'Fibonacci recurrence', 'sequences', 'a_{n+2}=a_{n+1}+a_n◊', ['数列', 'fibonacci']),
  t('sequence-limit', '数列极限', 'Sequence limit', 'sequences', String.raw`\lim_{n\to\infty}{a_n}◊`, ['数列', '极限', 'lim']),
  t('sequence-elements', '数列展开', 'Sequence elements', 'sequences', String.raw`a_1,a_2,\ldots,a_n◊`, ['数列', '省略号', 'sequence']),
];
/** Compositions use only the same admitted structure grammar as handwritten formulas. */
export const commonMathTemplates = [
  t('quadratic-formula', '一元二次方程求根', 'Quadratic formula', 'common', String.raw`x=\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}◊`, ['代数', '求根']),
  t('binomial-square', '完全平方公式', 'Binomial square', 'common', '(a+b)^{2}=a^{2}+2ab+b^{2}◊', ['代数']),
  t('difference-squares', '平方差公式', 'Difference of squares', 'common', 'a^{2}-b^{2}=(a+b)(a-b)◊', ['代数']),
  t('pythagorean', '勾股定理', 'Pythagorean theorem', 'common', 'a^{2}+b^{2}=c^{2}◊', ['几何']),
  t('circle-area', '圆的面积', 'Circle area', 'common', String.raw`S=\pi r^{2}◊`, ['几何']),
  t('trigonometric-identity', '三角恒等式', 'Trigonometric identity', 'common', String.raw`\sin^{2}{x}+\cos^{2}{x}=1◊`, ['三角', '函数']),
  t('integration-by-parts', '分部积分', 'Integration by parts', 'common', String.raw`\int{u}dv=uv-\int{v}du◊`, ['积分', 'calculus']),
  t('fundamental-calculus', '微积分基本定理', 'Fundamental theorem of calculus', 'common', String.raw`\int_{a}^{b}{f(x)}dx=F(b)-F(a)◊`, ['积分', 'calculus']),
  t('power-integral', '幂函数积分', 'Power rule integral', 'common', String.raw`\int{x^{n}}dx=\frac{x^{n+1}}{n+1}+C◊`, ['积分', 'calculus']),
  t('euler-identity', '欧拉公式', 'Euler identity', 'common', String.raw`e^{i\pi}+1=0◊`, ['复数']),
  t('mean', '平均数', 'Arithmetic mean', 'common', String.raw`\bar{x}=\frac{1}{n}\sum_{i=1}^{n}{x_i}◊`, ['统计', '平均值']),
  t('variance', '方差', 'Variance', 'common', String.raw`\sigma^{2}=\frac{1}{n}\sum_{i=1}^{n}{(x_i-\bar{x})^{2}}◊`, ['统计']),
  t('normal-density', '正态分布密度', 'Normal distribution density', 'common', String.raw`f(x)=\frac{1}{\sigma\sqrt{2\pi}}e^{-\frac{(x-\mu)^{2}}{2\sigma^{2}}}◊`, ['统计', '概率']),
  t('bayes', '贝叶斯公式', 'Bayes theorem', 'common', String.raw`P(A|B)=\frac{P(B|A)P(A)}{P(B)}◊`, ['统计', '概率']),
  t('determinant-2x2', '二阶行列式', 'Two by two determinant', 'common', String.raw`\begin{vmatrix}a&b\\c&d\end{vmatrix}=ad-bc◊`, ['矩阵', '行列式']),
  t('identity-matrix', '单位矩阵', 'Identity matrix', 'common', String.raw`I=\begin{bmatrix}1&0&0\\0&1&0\\0&0&1\end{bmatrix}◊`, ['矩阵']),
  t('piecewise-example', '绝对值分段函数', 'Absolute value piecewise', 'common', String.raw`f(x)=\begin{cases}x&x\ge0\\-x&x<0\end{cases}◊`, ['分段', '函数']),
  t('mass-energy', '质能关系', 'Mass energy equivalence', 'common', 'E=mc^{2}◊', ['物理']),
  t('newton', '牛顿第二定律', 'Newton second law', 'common', 'F=ma◊', ['物理']),
  t('ohm', '欧姆定律', 'Ohm law', 'common', 'U=IR◊', ['物理']),
];
