import type {
  QuireDocumentProfileEntry,
  QuireDocumentProfileRegistrationGap,
  QuireDocumentProfileRegistryResult
} from "./types";

/**
 * Builds a deterministic document-profile registry.
 *
 * Each facet must have exactly one owner, so a layout engine never has to
 * choose between competing semantics for the same document behavior.
 *
 * @param entries - Profile entries in extension and declaration order.
 * @returns A valid lookup registry, or the structural gaps that invalidate it.
 */
export function createQuireDocumentProfileRegistry<Profile = unknown>(
  entries: readonly QuireDocumentProfileEntry<Profile>[]
): QuireDocumentProfileRegistryResult<Profile> {
  const ids = new Map<string, QuireDocumentProfileEntry<Profile>[]>();
  const facets = new Map<string, QuireDocumentProfileEntry<Profile>[]>();

  for (const entry of entries) {
    ids.set(entry.id, [...(ids.get(entry.id) ?? []), entry]);
    for (const facet of new Set(entry.facets)) {
      facets.set(facet, [...(facets.get(facet) ?? []), entry]);
    }
  }

  const gaps: QuireDocumentProfileRegistrationGap<Profile>[] = [];
  for (const [id, idEntries] of ids) {
    if (idEntries.length > 1) {
      gaps.push({ code: "duplicate-document-profile-id", id, entries: idEntries });
    }
  }
  for (const [facet, facetEntries] of facets) {
    if (facetEntries.length > 1) {
      gaps.push({ code: "ambiguous-document-profile-facet", facet, entries: facetEntries });
    }
  }
  if (gaps.length > 0) {
    return { valid: false, gaps };
  }

  return {
    valid: true,
    registry: {
      entries: [...entries],
      getByFacet: (facet) => facets.get(facet)?.[0]
    }
  };
}
