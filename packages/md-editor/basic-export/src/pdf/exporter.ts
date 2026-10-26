/// <reference path="../vendor.d.ts" />
import type { MdExporter } from '@quirekit/md-editor';
import type { MdDocxDiagnostic } from '@quirekit/md-editor';
import { note } from '../diagnostics';
import { prepareBasicMarkdown } from '../source/prepare';
import type { MdBasicPdfOptions } from '../types';
import { createPdfDefinition } from './document';
import { installPdfFonts, pdfFontFamily } from './fonts';

/** PDF-specific report texts; shared codes use md-editor's own wording. */
const descriptions: Readonly<Record<string, Readonly<Record<'zh-CN' | 'en', string>>>> = {
  'pdf-italic': { 'zh-CN': '内嵌中文字体没有斜体字形，斜体文字以正体显示。', en: 'Italic text is upright because the embedded CJK font has no italic face.' },
};

/** @param data - PDF bytes. @returns Number of page objects. */
function countPages(data: Uint8Array): number {
  return new TextDecoder('latin1').decode(data).match(/\/Type\s*\/Page(?![s\w])/gu)?.length ?? 0;
}

/**
 * Creates the open-source PDF exporter for md-editor's `exporters` option.
 * Markdown is laid out by pdfmake with one embedded CJK font; the file is
 * produced in the browser and returned as bytes, never via the print dialog.
 * @param options - Fonts and limits.
 * @returns A PDF exporter.
 */
export function mdBasicPdfExport(options: MdBasicPdfOptions = {}): MdExporter {
  return {
    id: 'pdf', format: 'PDF', extension: 'pdf', mimeType: 'application/pdf',
    describeDiagnostic: (code, locale) => descriptions[code]?.[locale],
    async export(markdown, request) {
      const prepared = prepareBasicMarkdown(markdown, { alerts: false, containers: request.features.containers !== false });
      const diagnostics: MdDocxDiagnostic[] = [...prepared.diagnostics];
      if (request.policy.template) diagnostics.push(note('export', 'template-ignored', 'The basic exporter does not apply export styles; its default layout is used.'));
      const { default: pdfMake } = await import('pdfmake');
      // Every resource is embedded as bytes; nothing is fetched by URL during layout.
      pdfMake.setUrlAccessPolicy(() => false);
      await installPdfFonts(pdfMake, options.fonts, request.signal);
      const definition = await createPdfDefinition(prepared.markdown, pdfFontFamily, request.policy.resolveImage, diagnostics);
      request.signal.throwIfAborted();
      const data = new Uint8Array(await pdfMake.createPdf(definition).getBuffer());
      request.signal.throwIfAborted();
      const losses = diagnostics.filter(item => item.severity === 'warning');
      if (request.policy.lossPolicy === 'strict' && losses.length) throw new Error(`Strict export rejected ${losses.length} approximation(s): ${losses[0]!.message}`);
      return { data, diagnostics, pageCount: countPages(data) };
    },
  };
}
