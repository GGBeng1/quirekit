import { resolveExportTemplate } from '../resolve/resolve.js';
import type { ExportTemplateDefinition, ExportTemplateReference } from './types.js';

/** Stable default selection available without a commercial template library. */
export const defaultExportTemplateReference: ExportTemplateReference = Object.freeze({ id: 'quirekit-default', revision: '1' });
/** Read-only basic template; no commercial design assets. */
export const defaultExportTemplate: ExportTemplateDefinition = Object.freeze({ ...defaultExportTemplateReference,
  name: '默认', description: '保留当前 Word 导出样式', style: resolveExportTemplate() });

/** @param left - First reference. @param right - Other reference. @returns Exact identity and revision equality. */
export function sameExportTemplate(left: ExportTemplateReference, right: ExportTemplateReference): boolean {
  return left.id === right.id && left.revision === right.revision;
}
