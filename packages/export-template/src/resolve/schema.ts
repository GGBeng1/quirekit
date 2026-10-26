import type { Rule } from './types.js';
/** @param min - Lower bound. @param max - Upper bound. @returns Numeric rule. */
const number = (min: number, max: number): Rule => ({ kind: 'number', min, max });
/** @param fields - Permitted properties. @param atomic - Require complete overrides. @returns Strict object rule. */
const object = (fields: Record<string, Rule>, atomic = false): Rule => ({ kind: 'object', fields, atomic });
/** @param values - Accepted values. @returns Enum rule. */
const enumeration = (...values: string[]): Rule => ({ kind: 'string', values, max: 80 });
/** @param inner - Non-null rule. @returns Explicitly nullable rule. */
const nullable = (inner: Rule): Rule => ({ kind: 'nullable', inner });
const color: Rule = { kind: 'string', max: 6, color: true };
const boolean: Rule = { kind: 'boolean' };
const font: Rule = { kind: 'string', max: 120 };
const border = nullable(object({ color, width: number(0.125, 12) }, true));
const fonts = object({ latin: nullable(font), eastAsia: nullable(font), complex: nullable(font), theme: enumeration('minor', 'major') });
const text = object({ font: enumeration('body', 'heading', 'code', 'math'), size: number(5, 96), color: nullable(color), bold: boolean, italic: boolean });
const paragraph = object({ text, before: number(0, 144), after: number(0, 144),
  lineHeight: object({ kind: enumeration('multiple', 'exact'), value: number(0.5, 144) }, true),
  align: enumeration('left', 'center', 'right', 'justify'), firstLine: number(0, 144), keepNext: boolean, border, borderSpace: number(0, 31) });
const block = object({ paragraph, fill: nullable(color), border, padding: number(0, 31) });
const story = object({ enabled: boolean, left: { kind: 'string', max: 120 }, center: { kind: 'string', max: 120 }, right: { kind: 'string', max: 120 }, text, border });

/** Strict schema used for both persisted data and programmatic authoring. */
export const templateRule: Rule = object({ schemaVersion: number(1, 1),
  page: object({ width: number(100, 558.8), height: number(100, 558.8), orientation: enumeration('portrait', 'landscape'),
    margins: object({ top: number(0, 200), right: number(0, 200), bottom: number(0, 200), left: number(0, 200) }),
    headerDistance: number(0, 100), footerDistance: number(0, 100) }),
  fonts: object({ body: fonts, heading: fonts, code: fonts, math: fonts }), body: paragraph,
  headings: object({ h1: paragraph, h2: paragraph, h3: paragraph, h4: paragraph, h5: paragraph, h6: paragraph }),
  list: object({ paragraph, indent: number(1, 144), hanging: number(0, 72) }), quote: block, code: block,
  inlineCode: object({ text, fill: nullable(color) }),
  table: object({ paragraph, headerText: text, headerFill: nullable(color), border, padding: number(0, 36) }),
  containers: object({ note: block, tip: block, warning: block, caution: block, danger: block, details: block }),
  footnote: paragraph, math: paragraph, linkColor: nullable(color), rule: border, blockGap: number(0, 72),
  image: object({ maxWidth: number(1, 100), align: enumeration('left', 'center', 'right') }), header: story, footer: story,
});
