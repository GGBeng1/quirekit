import type { MdDocxConverter } from '@quirekit/md-editor';
import type { MdBasicExportOptions } from '../types';
import { exportBasicDocx } from './export';
import { importBasicDocx } from './import';

/**
 * Creates the open-source Word converter for md-editor's `docx` option.
 * The underlying libraries load on the first file action.
 * @param options - Converter limits.
 * @returns A converter for import and export of `.docx` files.
 */
export function mdBasicDocx(options: MdBasicExportOptions = {}): MdDocxConverter {
  return {
    importDocx: (data, request) => importBasicDocx(data, request),
    exportDocx: (markdown, request) => exportBasicDocx(markdown, request, options),
  };
}
