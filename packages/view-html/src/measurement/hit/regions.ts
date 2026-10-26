import type { QuireDocumentRange, QuirePoint, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "@quirekit/view-engine";
import type { HtmlBlockHitQuery, HtmlBlockHitTree } from "./types";

/**
 * Indexes measured leaves, retaining empty/collapsed containers as local boundaries.
 * @param root - Already measured continuous-flow geometry, never a new DOM scan.
 * @returns Balanced spatial bounds, or null without visible blocks.
 */
export function createHtmlBlockHitTree(root: QuireLayoutNode): HtmlBlockHitTree | null {
  const blocks: QuireLayoutNode[] = [];
  /** @param node - Measured subtree whose visible leaves are collected. */
  function collect(node: QuireLayoutNode): void {
    const before = blocks.length;
    for (const child of node.children ?? []) collect(child);
    if (blocks.length === before && node.kind === "block" && node.rect.width > 0 && node.rect.height > 0) blocks.push(node);
  }
  for (const child of root.children ?? []) collect(child);
  blocks.sort((a, b) => a.rect.y + a.rect.height / 2 - b.rect.y - b.rect.height / 2 || a.rect.x - b.rect.x || a.range.from - b.range.from);
  /**
   * Builds bounded branches once per geometry version, outside pointer input.
   * @param from - Inclusive sorted leaf index.
   * @param to - Exclusive sorted leaf index.
   * @returns Balanced subtree.
   */
  function build(from: number, to: number): HtmlBlockHitTree {
    if (to - from === 1) { const block = blocks[from]!; return { rect: block.rect, range: block.range, block }; }
    const middle = (from + to) >>> 1, first = build(from, middle), second = build(middle, to);
    const x = Math.min(first.rect.x, second.rect.x), y = Math.min(first.rect.y, second.rect.y);
    return { first, second,
      range: { from: Math.min(first.range.from, second.range.from), to: Math.max(first.range.to, second.range.to) },
      rect: { x, y, width: Math.max(first.rect.x + first.rect.width, second.rect.x + second.rect.width) - x,
        height: Math.max(first.rect.y + first.rect.height, second.rect.y + second.rect.height) - y }
    };
  }
  return blocks.length ? build(0, blocks.length) : null;
}

/**
 * Finds the closest visual row, then column, with document-order ties.
 * @param tree - Current retained block bounds.
 * @param point - Surface-local CSS point.
 * @param scope - Optional enclosing content range, including nested containers.
 * @returns Nearest eligible block and bounds visited by the query.
 */
export function queryHtmlBlockHitTree(tree: HtmlBlockHitTree | null, point: QuirePoint, scope?: QuireDocumentRange): HtmlBlockHitQuery {
  let best: QuireLayoutNode | null = null, bestY = Infinity, bestX = Infinity, visited = 0;
  /**
   * Prunes a branch only when its spatial lower bound cannot beat the current leaf.
   * @param branch - Candidate subtree.
   */
  function visit(branch: HtmlBlockHitTree): void {
    visited++;
    if (scope && (branch.range.to <= scope.from || branch.range.from >= scope.to)) return;
    const [dy, dx] = distance(branch.rect, point);
    if (dy > bestY || dy === bestY && (dx > bestX || dx === bestX && best && branch.range.from >= best.range.from)) return;
    if (branch.block) {
      if (scope && (branch.range.from < scope.from || branch.range.to > scope.to)) return;
      best = branch.block; bestY = dy; bestX = dx;
      return;
    }
    const first = branch.first!, second = branch.second!;
    const a = distance(first.rect, point), b = distance(second.rect, point);
    const firstNearer = a[0] < b[0] || a[0] === b[0] && (a[1] < b[1] || a[1] === b[1] && first.range.from < second.range.from);
    visit(firstNearer ? first : second); visit(firstNearer ? second : first);
  }
  if (tree) visit(tree);
  return { block: best, visited };
}

/**
 * Gives a rectangle's lower-bound vertical and horizontal distance.
 * @param rect - Surface-local bounds.
 * @param point - Query point in the same coordinate space.
 * @returns Vertical distance followed by horizontal distance.
 */
function distance(rect: QuireRect, point: QuirePoint): readonly [number, number] {
  return [Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height), Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width)];
}
