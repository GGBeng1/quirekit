import { resolveQuireTableFloatingPosition } from "@quirekit/layout/table";
import type { QuireLayoutBox } from "../../../types";
import type {
  QuireLayoutTranslation,
  QuirePageBodyProjection
} from "../types";

/** Cached descendant-floating-table fact keyed by immutable layout box identity. */
const floatingTableDescendantStore = new WeakMap<QuireLayoutBox, boolean>();

/**
 * Reports whether a layout box contains a floating table in its subtree.
 *
 * Zero-offset page projection usually preserves the source box by identity.
 * A floating descendant is the exception because it still needs page-relative
 * visual placement even when ordinary flow has no translation.
 *
 * @param box - Layout box subtree to inspect.
 * @returns Whether the box or one of its descendants is a floating table.
 */
export function containsQuireFloatingTable(
  box: QuireLayoutBox
): boolean {
  const cached = floatingTableDescendantStore.get(box);
  if (cached !== undefined) {
    return cached;
  }

  const contains = box.table?.floating != null ||
    ("children" in box &&
      Array.isArray(box.children) &&
      box.children.some(containsQuireFloatingTable));
  floatingTableDescendantStore.set(box, contains);
  return contains;
}

/**
 * Resolves the visual projection used by one table layout box.
 *
 * The box root remains in body flow so pagination and source ownership retain a
 * stable logical anchor. Only the table's visual product tree receives the
 * anchor-relative projection returned here.
 *
 * @param box - Source-flow table layout box.
 * @param projection - Logical page-body projection.
 * @returns Visual projection for the table and its retained descendants.
 */
export function resolveQuireFloatingTableVisualProjection(
  box: QuireLayoutBox,
  projection: QuireLayoutTranslation
): QuireLayoutTranslation {
  const table = box.table;
  if (
    table?.floating == null ||
    !isQuirePageBodyProjection(projection)
  ) {
    return projection;
  }

  const logicalAnchorRect = {
    x: box.rect.x + projection.dx,
    y: box.rect.y + projection.dy,
    width: projection.page.bodyRect.width,
    height: 0
  };
  const position = resolveQuireTableFloatingPosition({
    placement: table.floating,
    pageRect: projection.page.pageRect,
    marginRect: projection.marginRect ?? projection.page.bodyRect,
    textRect: logicalAnchorRect,
    tableRect: table.rect,
    indent: Math.max(0, table.rect.x - box.rect.x),
    pageIndex: projection.page.pageIndex
  });

  return {
    dx: position.x - table.rect.x,
    dy: position.y - table.rect.y
  };
}

/**
 * Checks whether a translation carries the owning physical page.
 *
 * @param projection - Candidate layout translation.
 * @returns Whether the translation is a page-body projection.
 */
function isQuirePageBodyProjection(
  projection: QuireLayoutTranslation
): projection is QuirePageBodyProjection {
  return "page" in projection;
}
