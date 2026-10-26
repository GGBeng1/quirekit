import type { ExportTemplateInput, ExportTemplateStyle } from '../definition/types.js';
import { defaultExportTemplateStyle } from '../presets/default.js';
import { templateRule } from './schema.js';
import type { ExportTemplateIssue, Rule } from './types.js';
import { freezeTemplate } from './freeze.js';

/** Configuration rejected before any export resources are allocated. */
export class ExportTemplateValidationError extends Error {
  /** @param issues - All discovered field failures. */
  constructor(readonly issues: readonly ExportTemplateIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
    this.name = 'ExportTemplateValidationError';
  }
}

/** @param input - Untrusted persisted configuration or partial typed authoring input.
 * @returns A complete deeply frozen snapshot, or a field-addressed validation error. */
export function resolveExportTemplate(input: ExportTemplateInput | unknown = {}): ExportTemplateStyle {
  const issues: ExportTemplateIssue[] = [];
  const result = resolve(templateRule, input, defaultExportTemplateStyle, '', issues) as ExportTemplateStyle;
  if (!issues.length) {
    const page = result.page, landscape = page.orientation === 'landscape';
    const width = landscape ? page.height : page.width, height = landscape ? page.width : page.height;
    if (width - page.margins.left - page.margins.right < 40) issues.push({ path: 'page.margins', message: '正文宽度至少需要 40 mm。' });
    if (height - page.margins.top - page.margins.bottom < 40) issues.push({ path: 'page.margins', message: '正文高度至少需要 40 mm。' });
    for (const name of ['header', 'footer'] as const) {
      const story = result[name];
      const budget = name === 'header' ? page.margins.top - page.headerDistance : page.margins.bottom - page.footerDistance;
      if (story.enabled && budget < (story.text.size * 1.5 + 6) * 25.4 / 72) issues.push({ path: name, message: '页边距不足以容纳页眉或页脚，请增加边距或缩小字号。' });
      for (const position of ['left', 'center', 'right'] as const) {
        if (/[\r\n]/u.test(story[position]) || /\{(?!title\}|page\}|pages\})[^}]*\}/u.test(story[position])) issues.push({ path: `${name}.${position}`, message: '只支持单行文字和 {title}、{page}、{pages}。' });
      }
    }
    for (const [path, role] of Object.entries({ body: result.body, ...result.headings, list: result.list.paragraph, code: result.code.paragraph, quote: result.quote.paragraph, math: result.math, footnote: result.footnote, table: result.table.paragraph,
      ...Object.fromEntries(Object.entries(result.containers).map(([key, value]) => [`containers.${key}.paragraph`, value.paragraph])) })) {
      if (role.lineHeight.kind === 'multiple' && role.lineHeight.value > 5) issues.push({ path: `${path}.lineHeight`, message: '倍数行距不得超过 5。' });
      if (role.lineHeight.kind === 'exact' && role.lineHeight.value < role.text.size) issues.push({ path: `${path}.lineHeight`, message: '固定行距不得小于文字字号。' });
    }
    if (result.list.hanging > result.list.indent) issues.push({ path: 'list.hanging', message: '悬挂距离不得超过列表缩进。' });
  }
  if (issues.length) throw new ExportTemplateValidationError(issues);
  return freezeTemplate(result);
}

/** @param rule - Schema node. @param input - Candidate. @param fallback - Baseline value.
 * @param path - Field path. @param issues - Diagnostic accumulator. @returns Validated fresh value. */
function resolve(rule: Rule, input: unknown, fallback: unknown, path: string, issues: ExportTemplateIssue[]): unknown {
  const value = input === undefined ? fallback : input;
  if (rule.kind === 'nullable') return value === null ? null : resolve(rule.inner, value, fallback, path, issues);
  if (rule.kind === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      issues.push({ path, message: '需要配置对象。' }); return fallback;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!Object.hasOwn(rule.fields, key)) issues.push({ path: path ? `${path}.${key}` : key, message: '未知配置字段。' });
    const defaults = fallback && typeof fallback === 'object' ? fallback as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(rule.fields).map(([key, field]) => {
      const at = path ? `${path}.${key}` : key;
      if (rule.atomic && input !== undefined && record[key] === undefined) issues.push({ path: at, message: '该配置组需要完整填写。' });
      return [key, resolve(field, record[key], defaults[key], at, issues)];
    }));
  }
  let valid = false;
  if (rule.kind === 'number') valid = typeof value === 'number' && Number.isFinite(value) && value >= rule.min && value <= rule.max;
  if (rule.kind === 'boolean') valid = typeof value === 'boolean';
  if (rule.kind === 'string') valid = typeof value === 'string' && value.length <= rule.max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value)
    && (!rule.values || rule.values.includes(value)) && (!rule.color || /^[\da-f]{6}$/iu.test(value));
  if (!valid) issues.push({ path, message: '值的类型、范围或格式不正确。' });
  return valid && rule.kind === 'string' && rule.color ? (value as string).toUpperCase() : value;
}
