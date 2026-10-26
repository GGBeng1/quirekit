import type { QuireLayoutSnapshotOptions } from "../../types";
import type { SectionLayoutProduct } from "../sections/types";
import type { QuirePaginationTextDerivation } from "./types";
import type { QuirePaginationTextDiagnostic } from "../../../layout/engine/types";

/** @param product - Accepted source product. @param diagnostics - Observable failures that preserve source results. @returns Product whose every viewport projection carries the same diagnostics. */
function withDiagnostics(product: SectionLayoutProduct, diagnostics: readonly QuirePaginationTextDiagnostic[]): SectionLayoutProduct {
  if (diagnostics.length === 0) return product;
  /** @param options - Current viewport. @returns Accepted geometry and invariant diagnostics. */
  const projectDocument = (options: QuireLayoutSnapshotOptions) => {
    const projected = product.projectDocument(options);
    return { ...projected, paginationTextDiagnostics: [...diagnostics, ...projected.paginationTextDiagnostics ?? []] };
  };
  return { ...product, document: { ...product.document, paginationTextDiagnostics: diagnostics }, projectDocument };
}

/** @param compile - Whole-flow measurement and pagination for a candidate text map. @param derive - Complete accepted page facts to next text. @returns Self-consistent source/geometry, or the original cache layout with a bounded-failure diagnostic. */
export function convergeQuirePaginationText(compile: (values?: ReadonlyMap<string, string>) => SectionLayoutProduct, derive: (product: SectionLayoutProduct) => QuirePaginationTextDerivation): SectionLayoutProduct {
  let product = compile();
  const fallback = product;
  const seen = new Set<string>();
  let previousValues: ReadonlyMap<string, string> = new Map();
  for (let pass = 0; pass < 8; pass++) {
    const next = derive(product);
    const removed = [...previousValues.keys()].some(key => !next.values.has(key));
    if (!next.changed && !removed) return withDiagnostics(product, next.diagnostics);
    const signature = JSON.stringify([...next.values]);
    const cycle = seen.has(signature);
    if (cycle || pass === 7) {
      const code = cycle ? "pagination-text-cycle" : "pagination-text-limit";
      return withDiagnostics(fallback, [...next.diagnostics, ...[...next.values.keys()].map(sourceAnchorId => ({ sourceAnchorId, code,
        message: "Pagination-dependent text did not converge within the admitted bound; original stored text and its measured geometry are retained." } as const))]);
    }
    seen.add(signature);
    // A changed string invalidates shaping, table height and page cuts together.
    // No viewport projection or collaborative source write enters this loop.
    product = compile(next.values);
    previousValues = next.values;
  }
  return fallback;
}
