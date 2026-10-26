import type { ExportBlockStyle, ExportFonts, ExportParagraphStyle, ExportTemplateStyle } from '../definition/types.js';
import { freezeTemplate } from '../resolve/freeze.js';

/** @param overrides - Role changes. @returns Complete baseline paragraph. */
function paragraph(overrides: Partial<ExportParagraphStyle> = {}): ExportParagraphStyle {
  return { text: { font: 'body', size: 10.5, color: null, bold: false, italic: false }, before: 0, after: 6,
    lineHeight: { kind: 'multiple', value: 1.15 }, align: 'left', firstLine: 0, keepNext: false, border: null, borderSpace: 0, ...overrides };
}
/** @param fill - Current container background. @param color - Current outline. @returns Baseline container. */
function container(fill: string, color: string): ExportBlockStyle {
  return { paragraph: paragraph(), fill, border: { color, width: 0.75 }, padding: 8 };
}
const theme: ExportFonts = { latin: null, eastAsia: null, complex: null, theme: 'minor' };
const story = { enabled: false, left: '', center: '', right: '', text: { ...paragraph().text, size: 9 }, border: null } as const;

/** Baseline carried forward from the accepted Markdown DOCX output; resolve before consumption. */
export const defaultExportTemplateStyle: ExportTemplateStyle = freezeTemplate<ExportTemplateStyle>({
  schemaVersion: 1,
  page: { width: 210, height: 297, orientation: 'portrait', margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }, headerDistance: 12.7, footerDistance: 12.7 },
  fonts: { body: theme, heading: { ...theme, theme: 'major' }, code: { ...theme, latin: 'Courier New' }, math: { ...theme, latin: 'Cambria Math' } },
  body: paragraph(),
  headings: {
    h1: paragraph({ text: { ...paragraph().text, size: 22, bold: true }, before: 12, after: 6, lineHeight: { kind: 'multiple', value: 1.1 }, keepNext: true }),
    h2: paragraph({ text: { ...paragraph().text, font: 'heading', size: 16, bold: true }, before: 12, after: 4, lineHeight: { kind: 'multiple', value: 1.1 }, keepNext: true }),
    h3: paragraph({ text: { ...paragraph().text, font: 'heading', size: 16, bold: true }, before: 10, after: 4, lineHeight: { kind: 'multiple', value: 1.1 }, keepNext: true }),
    h4: paragraph({ before: 10, after: 4, lineHeight: { kind: 'multiple', value: 1.1 } }),
    h5: paragraph({ before: 10, after: 4, lineHeight: { kind: 'multiple', value: 1.1 } }),
    h6: paragraph({ before: 10, after: 4, lineHeight: { kind: 'multiple', value: 1.1 } }),
  },
  list: { paragraph: paragraph({ after: 2 }), indent: 36, hanging: 18 },
  quote: { paragraph: paragraph(), fill: null, border: null, padding: 0 },
  code: { paragraph: paragraph({ text: { ...paragraph().text, font: 'code', size: 10 }, before: 4 }), fill: 'F5F5F5', border: { color: 'F5F5F5', width: 0.5 }, padding: 8 },
  inlineCode: { text: { ...paragraph().text, font: 'code' }, fill: null },
  // Cell padding already spaces the text; paragraph spacing would push it off-centre.
  table: { paragraph: paragraph({ after: 0 }), headerText: { ...paragraph().text, bold: true }, headerFill: 'F1F5F9', border: { color: 'CBD5E1', width: 0.75 }, padding: 5 },
  containers: { note: container('F0F6FF', 'BFD7FA'), tip: container('EDF9F1', 'BCE1C8'), warning: container('FFF5E8', 'FAD8AC'), caution: container('FFF5E8', 'FAD8AC'), danger: container('FFF0F0', 'F2BBBB'), details: container('F0F6FF', 'BFD7FA') },
  footnote: paragraph(), math: paragraph(), linkColor: '0563C1', rule: { color: '000000', width: 0.5 }, blockGap: 8,
  image: { maxWidth: 100, align: 'left' }, header: story, footer: story,
});
