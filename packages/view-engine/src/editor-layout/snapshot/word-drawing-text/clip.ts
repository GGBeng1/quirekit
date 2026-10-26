import type { QuireLayoutBox, QuireLayoutContainer } from "../../../layout/engine/types";

/**
 * Removes measured lines wholly outside the accepted inner frame.
 *
 * This bounds layout participation by removing complete lines below the frame.
 * Display-list composition separately wraps every direct-owner paint batch in
 * the exact inner-frame clip, which handles partial glyph overflow on both axes.
 * Scroll/autofit policies can later replace this conservative pruning without
 * changing story ownership or the persistent paint boundary.
 *
 * @param layout - Fully measured story-local layout.
 * @param height - Accepted inner text height.
 * @returns Layout tree containing only geometry that begins inside the frame.
 */
export function clipDrawingTextLayout(
  layout: QuireLayoutContainer,
  height: number
): QuireLayoutContainer {
  return clipDrawingTextBox(layout, height) as QuireLayoutContainer;
}

/**
 * Clips one measured box recursively against the local block-end boundary.
 *
 * @param box - Story-local measured box.
 * @param height - Accepted inner text height.
 * @returns Box with out-of-frame fragments and children removed.
 */
function clipDrawingTextBox(
  box: QuireLayoutBox,
  height: number
): QuireLayoutBox {
  const textFragments = box.textFragments?.filter((fragment) =>
    fragment.rect.y < height
  );
  const children = "children" in box && Array.isArray(box.children)
    ? box.children
        .filter((child) => child.rect.y < height)
        .map((child) => clipDrawingTextBox(child, height))
    : undefined;

  return {
    ...box,
    ...(textFragments === undefined ? {} : { textFragments }),
    ...(children === undefined ? {} : { children })
  };
}
