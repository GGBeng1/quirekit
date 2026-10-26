import { mathTemplates } from '../templates/catalog';
import { mathSymbolCommands } from '../latex/symbols';
import { freezeMathValue } from '../shared/freeze';
import type { MathCommand, MathCommandCategory } from './types';
import { createMathTemplatePreview, createMathPreview } from './preview';

const operatorNames: Record<string, string> = { times: '乘号', cdot: '点乘', div: '除号', pm: '正负号', mp: '负正号', le: '小于等于', ge: '大于等于', ne: '不等于', approx: '约等于', infty: '无穷', partial: '偏微分', nabla: '梯度', in: '属于', notin: '不属于', cup: '并集', cap: '交集', forall: '任意', exists: '存在', to: '右箭头', leftarrow: '左箭头' };
const operatorEnglish: Record<string, string> = { times: 'Multiply', cdot: 'Dot product', div: 'Divide', pm: 'Plus or minus', mp: 'Minus or plus', le: 'Less than or equal', ge: 'Greater than or equal', ne: 'Not equal', approx: 'Approximately equal', infty: 'Infinity', partial: 'Partial derivative', nabla: 'Nabla', in: 'Element of', notin: 'Not an element of', cup: 'Union', cap: 'Intersection', forall: 'For all', exists: 'Exists', to: 'Right arrow', leftarrow: 'Left arrow' };
const extraNames: Record<string, readonly [string, string]> = {
  leftrightarrow: ['双向箭头', 'Bidirectional arrow'], Rightarrow: ['推出', 'Implies'], Leftarrow: ['由此得出', 'Implied by'], Leftrightarrow: ['等价', 'If and only if'],
  ldots: ['省略号', 'Ellipsis'], cdots: ['居中省略号', 'Centered ellipsis'], vdots: ['竖省略号', 'Vertical ellipsis'], ddots: ['对角省略号', 'Diagonal ellipsis'],
  equiv: ['恒等于', 'Equivalent'], sim: ['相似', 'Similar'], simeq: ['渐近等于', 'Asymptotically equal'], propto: ['正比于', 'Proportional'],
  subset: ['子集', 'Subset'], supset: ['超集', 'Superset'], subseteq: ['子集或相等', 'Subset or equal'], supseteq: ['超集或相等', 'Superset or equal'],
  emptyset: ['空集', 'Empty set'], perp: ['垂直', 'Perpendicular'], parallel: ['平行', 'Parallel'], angle: ['角', 'Angle'], degree: ['角度', 'Degree'],
  otimes: ['张量积', 'Tensor product'], oplus: ['直和', 'Direct sum'], odot: ['圆点乘', 'Circled dot'], land: ['逻辑与', 'Logical and'], lor: ['逻辑或', 'Logical or'], neg: ['逻辑非', 'Logical negation'],
};
const greek = ['阿尔法', '贝塔', '伽马', '德尔塔', '艾普西隆', '泽塔', '伊塔', '西塔', '约塔', '卡帕', '兰姆达', '缪', '纽', '克西', '奥米克戎', '派', '柔', '西格玛', '陶', '宇普西隆', '斐', '希', '普西', '欧米伽'];
const greekNames = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega'.split(' ');
/** Shared visual choices for toolbar and command search, with bilingual hover names. */
let commands: readonly MathCommand[] | undefined;
/**
 * Lazily constructs bounded command illustrations; importing the core performs no preview parsing.
 * @returns Shared immutable discovery catalog with no renderer or UI dependency.
 */
export function getMathCommands(): readonly MathCommand[] {
  return commands ??= freezeMathValue([
    ...mathTemplates.map(template => ({
      value: template.id, label: template.label, english: template.english ?? template.id, keywords: template.keywords,
      group: template.group ?? 'basic', document: createMathTemplatePreview(template),
    })),
    ...symbolEntries().map(([name, value]) => symbolCommand(name, value)),
  ]);
}
/**
 * Lists named single-glyph symbols once per glyph; escapes and word symbols are not palette items.
 * @returns Command name and glyph pairs.
 */
function symbolEntries(): readonly (readonly [string, string])[] {
  const seen = new Set<string>();
  return Object.entries(mathSymbolCommands).filter(([name, value]) => {
    if (!/^[A-Za-z]+$/u.test(name) || [...value].length !== 1 || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
/**
 * Describes one symbol for discovery with bilingual names.
 * @param name - Command name without backslash.
 * @param value - Inserted glyph.
 * @returns Catalog entry.
 */
function symbolCommand(name: string, value: string): MathCommand {
  const greekIndex = greekNames.indexOf(name.toLowerCase().replace(/^var/u, ''));
  const greekLabel = greekIndex < 0 ? undefined : `${name.startsWith('var') ? '变体' : /^[A-Z]/u.test(name) ? '大写' : ''}${greek[greekIndex]}`;
  const isGreek = /\p{Script=Greek}/u.test(value);
  return {
    value: `symbol:${value}`, label: operatorNames[name] ?? extraNames[name]?.[0] ?? greekLabel ?? value,
    english: operatorEnglish[name] ?? extraNames[name]?.[1] ?? name,
    keywords: [name, value, isGreek ? '希腊 greek' : '运算 operator', '符号 symbol'],
    group: isGreek ? 'greek' : 'symbols', document: createMathPreview(`\\${name}`),
  };
}
/** Popular structures shown in an empty command search. */
export const featuredMathCommandIds = ['fraction', 'square-root', 'cube-root', 'superscript', 'subscript', 'square', 'definite-integral', 'summation', 'function-sin'];
/** Semantic category labels, rather than text labels under each formula glyph. */
export const mathCommandCategories: readonly MathCommandCategory[] = [
  { value: 'basic', label: '分数、根式与角标', english: 'Fractions, roots and scripts', glyph: '√' },
  { value: 'calculus', label: '积分与微分', english: 'Integrals and derivatives', glyph: '∫' },
  { value: 'operators', label: '求和与大型运算', english: 'Sums and large operators', glyph: '∑' },
  { value: 'functions', label: '函数与对数', english: 'Functions and logarithms', glyph: 'ƒ' },
  { value: 'accents', label: '重音与注释', english: 'Accents and annotations', glyph: 'x̂' },
  { value: 'delimiters', label: '括号与取整', english: 'Brackets and rounding', glyph: '( )' },
  { value: 'matrix', label: '矩阵与分段', english: 'Matrices and cases', glyph: '▦' },
  { value: 'sequences', label: '数列与级数', english: 'Sequences and series', glyph: 'aₙ' },
  { value: 'greek', label: '希腊字母', english: 'Greek letters', glyph: 'α' },
  { value: 'symbols', label: '运算与关系', english: 'Operators and relations', glyph: '±' },
  { value: 'common', label: '常用公式', english: 'Formula presets', glyph: '⋯' },
];
/**
 * Finds commands across every family with human names and syntax aliases.
 * @param item - One admitted visual choice.
 * @param query - User's Chinese/English search.
 * @returns Whether all query words match its names or aliases.
 */
export function matchesMathCommand(item: MathCommand, query: string): boolean {
  const text = [item.label, item.english, ...item.keywords].join(' ').toLowerCase();
  return query.trim().toLowerCase().split(/\s+/u).every(word => text.includes(word));
}

/**
 * Finds admitted commands across categories without prescribing menu behavior.
 * @param query - Human names or syntax aliases, in Chinese or English.
 * @returns Matching commands in stable catalog order.
 */
export function searchMathCommands(query: string): readonly MathCommand[] {
  return getMathCommands().filter(item => matchesMathCommand(item, query));
}
