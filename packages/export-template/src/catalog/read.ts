import { resolveExportTemplate } from '../resolve/resolve.js';
import { freezeTemplate } from '../resolve/freeze.js';
import type { ExportTemplateDefinition, ExportTemplateProvider, ExportTemplateReference } from './types.js';

/** @param provider - Host-owned storage and authorization. @param reference - Exact requested revision.
 * @param signal - Operation lifetime. @returns Validated immutable snapshot; a provider cannot silently substitute a revision. */
export async function readExportTemplate(provider: ExportTemplateProvider, reference: ExportTemplateReference, signal?: AbortSignal): Promise<ExportTemplateDefinition> {
  const requested = { ...reference }; signal?.throwIfAborted();
  const value = await provider.read(requested, signal); signal?.throwIfAborted();
  if (value.id !== requested.id || value.revision !== requested.revision) throw new Error('The template provider returned a different revision.');
  return freezeTemplate({ ...structuredClone(value), style: resolveExportTemplate(value.style) });
}
