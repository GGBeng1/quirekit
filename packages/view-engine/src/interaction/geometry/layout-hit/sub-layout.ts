import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import { hitTestQuireSubLayoutQueryProducts } from "../../sub-layout-query";
import type { QuireHitTestResult } from "../../types";

/** Options used to resolve retained sub-layout hit targets. */
interface QuireSubLayoutHitTargetOptions {
  /** Layout nodes that may expose retained sub-layout query products. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Document-space point to test against retained sub-layout products. */
  readonly point: QuirePoint;
}

/**
 * Maps retained sub-layout query products to a document-position hit.
 *
 * Sub-layout query products are retained interaction facts. Keeping this query
 * local to `interaction/geometry` prevents mounted views from reinterpreting
 * nested-flow products themselves.
 *
 * @param options - Candidate layout nodes and document-space point.
 * @returns Sub-layout hit result, or null when no retained product applies.
 */
export function hitTestQuireSubLayoutGeometryAtPoint(
  options: QuireSubLayoutHitTargetOptions
): QuireHitTestResult | null {
  return hitTestQuireSubLayoutQueryProducts(options.nodes, options.point);
}
