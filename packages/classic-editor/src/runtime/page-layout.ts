import type { Node as PMNode } from "@quirekit/pm";
import type { QuireLayoutNode, QuireLayoutPage, QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { ClassicEditorPageLayout } from "../types/runtime";

/**
 * Reads the pages of a rendered layout snapshot.
 * @param snapshot - Latest rendered layout, or undefined before the first render.
 * @param document - Document the caller expects the layout to belong to.
 * @returns Pages in order, or null when the snapshot belongs to another document or has no pages.
 */
export function readClassicEditorPageLayout(snapshot: QuireLayoutSnapshot | undefined, document: PMNode): readonly ClassicEditorPageLayout[] | null {
  if (snapshot === undefined || snapshot.state.pm.doc !== document || snapshot.pages === undefined || snapshot.pages.length === 0) return null;
  const bottoms = collectContentBottoms(snapshot.root, snapshot.pages);
  return snapshot.pages.map((page, index) => ({
    ...(page.terminalPlacement === undefined ? {} : { terminalPlacement: page.terminalPlacement }),
    from: page.range.from,
    to: page.range.to,
    bodyTop: page.bodyRect.y,
    bodyBottom: page.bodyRect.y + page.bodyRect.height,
    contentBottom: bottoms[index] ?? null
  }));
}

/**
 * Finds, per page, the lowest bottom of text lines and leaf boxes starting inside its body. Headers and
 * footers lie outside the body band, so they do not count; pages whose content is not realized stay unknown.
 * @param root - Projected layout tree.
 * @param pages - Pages in order.
 * @returns Lowest content bottom per page index.
 */
function collectContentBottoms(root: QuireLayoutNode, pages: readonly QuireLayoutPage[]): (number | undefined)[] {
  const bottoms: (number | undefined)[] = [];
  const record = (top: number, bottom: number) => {
    const index = pages.findIndex(page => top >= page.bodyRect.y - 0.5 && top < page.bodyRect.y + page.bodyRect.height - 0.5);
    if (index >= 0) bottoms[index] = Math.max(bottoms[index] ?? -Infinity, bottom);
  };
  const visit = (node: QuireLayoutNode) => {
    for (const fragment of node.textFragments ?? []) record(fragment.rect.y, fragment.rect.y + fragment.rect.height);
    if (node.children === undefined || node.children.length === 0) {
      if ((node.textFragments?.length ?? 0) === 0 && node.rect.height > 0) record(node.rect.y, node.rect.y + node.rect.height);
      return;
    }
    node.children.forEach(visit);
  };
  visit(root);
  return bottoms;
}
