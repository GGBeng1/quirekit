import type { ExportTemplateStyle } from '../definition/types.js';

/** Stable document-owned selection. Revisions are immutable. */
export interface ExportTemplateReference {
  /** Provider-local identity. */ readonly id: string;
  /** Exact immutable revision. */ readonly revision: string;
}
/** Design-asset provenance retained when a template is copied. */
export interface ExportTemplateProvenance {
  /** Content pack identity, distinct from component entitlement. */ readonly packId: string;
  /** Original template and revision. */ readonly source: ExportTemplateReference;
  /** License information supplied by the host. */ readonly license: string;
}
/** Resolved immutable data authorized by the provider for use in this operation. */
export interface ExportTemplateDefinition extends ExportTemplateReference {
  /** Display name. */ readonly name: string;
  /** Short purpose. */ readonly description: string;
  /** Complete configuration snapshot. */ readonly style: ExportTemplateStyle;
  /** Retained content-pack provenance, absent for independent user work. */ readonly provenance?: ExportTemplateProvenance;
}
/** Gallery metadata; locked entries must not contain protected style definitions. */
export interface ExportTemplateEntry extends ExportTemplateReference {
  /** Display name. */ readonly name: string;
  /** Short purpose. */ readonly description: string;
  /** Collection group. */ readonly origin: 'builtin' | 'personal' | 'organization';
  /** Current host-resolved availability. */ readonly availability: 'usable' | 'preview' | 'locked' | 'unavailable';
  /** Whether this definition can be duplicated. */ readonly canCopy: boolean;
  /** Whether a new revision can be saved under this identity. */ readonly canEdit: boolean;
  /** Whether the user can delete this identity. */ readonly canDelete: boolean;
  /** Publicly distributable static preview URL, if available. */ readonly previewUrl?: string;
}
/** Draft passed to a provider; a saved revision is never mutated in place. */
export interface ExportTemplateDraft {
  /** Required nonempty display name. */ readonly name: string;
  /** Short description. */ readonly description: string;
  /** Complete validated configuration. */ readonly style: ExportTemplateStyle;
  /** Source to retain on copy/save. */ readonly provenance?: ExportTemplateProvenance;
}
/** Host boundary for remote, memory or explicitly scoped local storage. */
export interface ExportTemplateProvider {
  /** List metadata without returning paid configurations to unauthorized users. */ readonly list: (signal?: AbortSignal) => Promise<readonly ExportTemplateEntry[]>;
  /** Authorize and read the exact revision; never silently replace it. */ readonly read: (reference: ExportTemplateReference, signal?: AbortSignal) => Promise<ExportTemplateDefinition>;
  /** Save a copy, or compare-and-swap a new revision against an expected old revision. */ readonly save?: (draft: ExportTemplateDraft, expected?: ExportTemplateReference) => Promise<ExportTemplateDefinition>;
  /** Delete an identity only when its latest revision still matches. */ readonly remove?: (expected: ExportTemplateReference) => Promise<void>;
}
