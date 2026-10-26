import { doQuireRectsIntersect } from "@quirekit/renderer";
import type { QuireLayoutNode, QuireTableHitTarget } from "../../../layout";
import type { QuireHitTestResult } from "../../types";
import type { QuireInteractionPageBodyNearestCaretOptions } from "../types";
import { isQuirePointerTransparentLayoutNode } from "../../layout-node-role";
import { findQuireTableHitTargetAtPoint } from "../../table";
import { readQuireSubLayoutTextCaretStops } from "../../sub-layout-query/text-geometry";
import { measureQuireSubLayoutLineDistanceY } from "../../sub-layout-query/shared";
import { buildQuireNearestSubLayoutCaretHit } from "../../sub-layout-query/hit/nearest";
import { mapPointToLayoutNodePosition } from "../layout-hit/node-position";
import { findNearestQuireTableCellHitTargetAtPoint, withQuireTableCellSelectionHit } from "../layout-hit/table-cell";
import { isQuirePageBodyCaretPosition, readQuirePageBodyCaretLine } from "./line";
import { resolveQuirePageBodyRawCaret } from "./raw-text";
import type { QuirePageBodyCaretCandidate, QuirePageBodyCaretScope } from "./types";

/**
 * Chooses page-edge carets by visual line first and shaped horizontal position second.
 * @param nodes - Canonical body roots retaining nested provider products.
 * @param options - Accepted page, source, and projected document-space point.
 * @returns An actual retained caret hit; structural container ranges never substitute.
 */
export function findQuirePageBodyNearestCaret(
  nodes: readonly QuireLayoutNode[],
  options: QuireInteractionPageBodyNearestCaretOptions
): QuireHitTestResult {
  const targets = options.snapshot.hitTargets.filter((target) =>
    doQuireRectsIntersect(target.rect, options.page.bodyRect));
  const scope: QuirePageBodyCaretScope = {
    page: options.page,
    repeatedTargets: targets.filter((target): target is QuireTableHitTarget =>
      "isRepeatedHeader" in target && target.isRepeatedHeader === true)
  };
  let winner: QuirePageBodyCaretCandidate | null = null;
  let nearestY = Number.POSITIVE_INFINITY;
  let nearestX = Number.POSITIVE_INFINITY;

  /**
   * Compares every source representation in the same document coordinate space.
   * @param candidate - One page-admitted raw or nested caret.
   */
  function consider(candidate: QuirePageBodyCaretCandidate): void {
    const y = measureQuireSubLayoutLineDistanceY(candidate.lineRect, options.point.y);
    const x = Math.abs(candidate.caretX - options.point.x);
    if (y < nearestY || (y === nearestY && x < nearestX)) {
      winner = candidate;
      nearestY = y;
      nearestX = x;
    }
  }

  /**
   * Scans admitted raw text and explicit nested lines once, retaining provider identity.
   * @param children - Current subtree in stable layout order.
   */
  function visit(children: readonly QuireLayoutNode[]): void {
    for (const node of children) {
      if (isQuirePointerTransparentLayoutNode(node)) continue;
      const products = node.subLayoutQueryProducts;
      if (products !== undefined) {
        for (const rectangle of products.selectionRects) {
          const line = readQuirePageBodyCaretLine(scope, rectangle.rect, rectangle.range);
          if (line === null) continue;
          for (const stop of readQuireSubLayoutTextCaretStops(products, rectangle)) {
            if (!isQuirePageBodyCaretPosition(line, stop.position.pos)) continue;
            consider({
              lineRect: line.rect, caretX: stop.rect.x,
              subLayout: { products, stop }
            });
          }
        }
      }
      const raw = resolveQuirePageBodyRawCaret(node, scope, options.point);
      if (raw !== null) consider(raw);
      visit(node.children ?? []);
    }
  }

  // Source-only helpers are ignored, while complete body ancestors may retain
  // later pages: admission occurs at each actual line, never at a broad wrapper.
  visit(nodes);
  const accepted = winner as QuirePageBodyCaretCandidate | null;
  if (accepted === null) return { kind: "miss" };
  const hit = "subLayout" in accepted
    ? buildQuireNearestSubLayoutCaretHit(accepted.subLayout)
    : { kind: "position" as const, ...mapPointToLayoutNodePosition(accepted.node, accepted.point) };
  // Caret provenance identifies the text, while structural selection admission
  // remains owned by the original pointer point, including table-owned gaps.
  const cell = findQuireTableHitTargetAtPoint({
    hitTargets: targets,
    point: options.point
  }) ?? findNearestQuireTableCellHitTargetAtPoint({ candidateNodes: nodes, point: options.point });
  return withQuireTableCellSelectionHit(hit, cell !== null
    && hit.position.pos >= cell.range.from && hit.position.pos <= cell.range.to ? cell : null);
}
