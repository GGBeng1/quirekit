import { describe, expect, it } from 'vitest';
import { defaultExportTemplateStyle, defaultExportTemplate, readExportTemplate, ExportTemplateValidationError, resolveExportTemplate } from '../index.js';

describe('export template resolution', () => {
  it('默认模板的表格段落不加段前段后，单元格内距负责留白', () => {
    expect(resolveExportTemplate().table.paragraph).toMatchObject({ before: 0, after: 0 });
  });

  it('preserves the verified baseline and freezes isolated snapshots', () => {
    const first = resolveExportTemplate();
    expect(first).toEqual(defaultExportTemplateStyle);
    expect(Object.isFrozen(defaultExportTemplateStyle.fonts.body)).toBe(true);
    expect(Object.isFrozen(first.containers.note.paragraph.text)).toBe(true);
    expect(resolveExportTemplate().page).not.toBe(first.page);
  });
  it('preserves zero, false and explicit border removal', () => {
    const value = resolveExportTemplate({ blockGap: 0, body: { after: 0 }, headings: { h1: { keepNext: false, border: null } }, table: { padding: 0 } });
    expect(value.body.after).toBe(0);
    expect(value.blockGap).toBe(0);
    expect(value.headings.h1.keepNext).toBe(false);
    expect(value.table.padding).toBe(0);
  });
  it.each([
    { page: { margins: { left: 150, right: 100 } } }, { body: { after: NaN } }, { body: { lineHeight: { kind: 'exact' } } },
    { headings: { h1: { border: { color: 'red', width: 1 } } } }, { code: { padding: -1 } }, { schemaVersion: 2 },
    { body: { lineHeight: { kind: 'exact', value: 1 } } }, { footer: { enabled: true, text: { size: 72 } } },
    { header: { center: '{execute}' } }, { containers: { note: { paragraph: { lineHeight: { kind: 'exact', value: 1 } } } } }, { unexpected: true }, JSON.parse('{"__proto__":{"enabled":true}}'),
  ])('rejects invalid or ambiguous input before resource work: %j', input => {
    expect(() => resolveExportTemplate(input)).toThrow(ExportTemplateValidationError);
  });
  it('does not mutate authoring input and normalizes colors', () => {
    const input = { body: { text: { color: 'abcdef' } } };
    expect(resolveExportTemplate(input).body.text.color).toBe('ABCDEF');
    expect(input.body.text.color).toBe('abcdef');
  });
});

 it('pins asynchronous host reads and rejects silent revision substitution', async () => {
   const provider = { list: async () => [], read: async () => defaultExportTemplate };
   await expect(readExportTemplate(provider, { id: 'missing', revision: '2' })).rejects.toThrow('different revision');
   const controller = new AbortController();
   const task = readExportTemplate(provider, defaultExportTemplate, controller.signal); controller.abort();
   await expect(task).rejects.toThrow();
 });
