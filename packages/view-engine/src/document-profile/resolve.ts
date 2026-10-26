import type { QuireExtensionManager } from "@quirekit/core";
import { quireNeutralDocumentProfile } from "./defaults";
import type {
  QuireDocumentLayoutProfile,
  QuireDocumentProfileFacetName,
  QuireResolvedDocumentProfile
} from "./types";

const knownFacets: readonly string[] = ["inline-sources", "page-model", "paragraph-model", "table-model", "drawing-model"] satisfies QuireDocumentProfileFacetName[];

/** Error raised when document-profile registrations cannot be used by the engine. */
export class QuireDocumentProfileRegistrationError extends Error {
  /** Stable diagnostics explaining why the profile was rejected. */
  readonly diagnostics: readonly string[];

  /**
   * Creates a registration failure without a fallback to neutral defaults.
   *
   * @param diagnostics - Stable registration or payload messages.
   */
  constructor(diagnostics: readonly string[]) {
    super(`Invalid document-profile registration: ${diagnostics.join(", ")}`);
    this.name = "QuireDocumentProfileRegistrationError";
    this.diagnostics = diagnostics;
  }
}

type ProfileSource = Pick<QuireExtensionManager, "documentProfiles" | "documentProfileRegistry">;

const resolvedProfiles = new WeakMap<ProfileSource, QuireResolvedDocumentProfile>();

/**
 * Resolves the complete document profile for one editor composition.
 *
 * Registered facets override neutral defaults. Invalid registrations throw
 * because a half-applied profile would mix semantics; results are cached per
 * extension manager so snapshot builds do not revalidate.
 *
 * @param extensionManager - Core extension manager, or undefined for state-only layout.
 * @returns Facet set with defaults applied.
 */
export function resolveQuireDocumentProfile(
  extensionManager: ProfileSource | undefined
): QuireResolvedDocumentProfile {
  if (extensionManager === undefined || extensionManager.documentProfiles.length === 0) {
    return quireNeutralDocumentProfile;
  }
  const cached = resolvedProfiles.get(extensionManager);
  if (cached !== undefined) return cached;
  const registry = extensionManager.documentProfileRegistry;
  if (registry === null) {
    throw new QuireDocumentProfileRegistrationError(["Core rejected duplicate or ambiguous document profiles."]);
  }

  // Core already guarantees one owner per facet, so each facet is read once.
  const facets: Record<string, unknown> = {};
  const diagnostics: string[] = [];
  for (const entry of registry.entries) {
    for (const facet of entry.facets) {
      const implementation = (entry.profile as Record<string, unknown> | null)?.[facet];
      if (!knownFacets.includes(facet)) {
        diagnostics.push(`Profile "${entry.id}" declares unknown facet "${facet}".`);
      } else if (typeof implementation !== "function") {
        diagnostics.push(`Profile "${entry.id}" declares facet "${facet}" without an implementation.`);
      } else {
        facets[facet] = implementation;
      }
    }
  }
  if (diagnostics.length > 0) throw new QuireDocumentProfileRegistrationError(diagnostics);

  const profile = facets as QuireDocumentLayoutProfile;
  const resolved: QuireResolvedDocumentProfile = {
    inlineSources: profile["inline-sources"] ?? quireNeutralDocumentProfile.inlineSources,
    pageModel: profile["page-model"]?.() ?? quireNeutralDocumentProfile.pageModel,
    paragraphModel: profile["paragraph-model"]?.() ?? quireNeutralDocumentProfile.paragraphModel,
    tableModel: profile["table-model"]?.() ?? quireNeutralDocumentProfile.tableModel,
    drawingModel: profile["drawing-model"]?.() ?? quireNeutralDocumentProfile.drawingModel
  };
  resolvedProfiles.set(extensionManager, resolved);
  return resolved;
}
