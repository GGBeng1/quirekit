import type { MdEditorLocale } from '../types';
import { mdEditorMessages } from '../messages';
import type { MdFileIntent } from './types';

/**
 * Keeps file presentation independent of asynchronous conversion ownership.
 * @param intent - Captured file intent, including any installed exporter.
 * @param locale - Current control language.
 * @returns Localized export labels and the actual artifact media type.
 */
export function fileExportPresentation(intent: Pick<MdFileIntent, 'exporter'>, locale: MdEditorLocale) {
  const text = mdEditorMessages[locale], exporter = intent.exporter;
  if (!exporter) return { title: text.wordExport, hint: text.wordExportHint, converting: text.wordConverting,
    download: text.wordDownload, error: text.wordError,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' } as const;
  const format = (template: string): string => template.replace('{format}', exporter.format);
  return { title: format(text.formatExport), hint: format(text.formatExportHint), converting: format(text.formatConverting),
    download: format(text.formatDownload), error: format(text.formatError), mime: exporter.mimeType, extension: exporter.extension } as const;
}
