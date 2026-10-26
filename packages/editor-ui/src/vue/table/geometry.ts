import type {
  QuireMountedCapabilityRect,
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeModel
} from "@quirekit/core";
import type { CSSProperties } from "vue";
import type {
  EditorUITableMovePreview
} from "./types";

/**
 * Builds workspace-scroll positioning for one column bar.
 *
 * @param anchor - Viewport-projected column anchor.
 * @returns CSS positioning for the flat column segment.
 */
export function createEditorUITableColumnBarStyle(
  anchor: QuireMountedTableChromeAnchor
): CSSProperties {
  return {
    left: `${anchor.rect.left}px`,
    top: `${anchor.rect.top - 13}px`,
    width: `${Math.max(8, anchor.rect.right - anchor.rect.left)}px`
  };
}

/**
 * Builds workspace-scroll positioning for one row bar.
 *
 * @param anchor - Viewport-projected row anchor.
 * @returns CSS positioning for the flat row segment.
 */
export function createEditorUITableRowBarStyle(
  anchor: QuireMountedTableChromeAnchor
): CSSProperties {
  return {
    left: `${anchor.rect.left - 13}px`,
    top: `${anchor.rect.top}px`,
    height: `${Math.max(8, anchor.rect.bottom - anchor.rect.top)}px`
  };
}

/**
 * Translates cached viewport Table chrome without rebuilding retained layout.
 *
 * @param model - Latest viewport-projected Table chrome.
 * @param deltaX - Horizontal viewport displacement in CSS pixels.
 * @param deltaY - Vertical viewport displacement in CSS pixels.
 * @returns Chrome model translated by the supplied viewport delta.
 */
export function translateEditorUITableChromeModel(
  model: QuireMountedTableChromeModel,
  deltaX: number,
  deltaY: number
): QuireMountedTableChromeModel {
  return {
    ...model,
    fragments: model.fragments.map((fragment) => ({
      ...fragment,
      tableRect: translateEditorUITableChromeRect(
        fragment.tableRect,
        deltaX,
        deltaY
      ),
      guides: (fragment.guides ?? []).map((guide) => ({
        ...guide,
        rect: translateEditorUITableChromeRect(
          guide.rect,
          deltaX,
          deltaY
        )
      })),
      corner: translateEditorUITableChromeAnchor(
        fragment.corner,
        deltaX,
        deltaY
      ),
      rows: fragment.rows.map((anchor) =>
        translateEditorUITableChromeAnchor(anchor, deltaX, deltaY)
      ),
      columns: fragment.columns.map((anchor) =>
        translateEditorUITableChromeAnchor(anchor, deltaX, deltaY)
      ),
      insertions: fragment.insertions.map((anchor) =>
        translateEditorUITableChromeAnchor(anchor, deltaX, deltaY)
      ),
      resizes: fragment.resizes.map((anchor) =>
        translateEditorUITableChromeAnchor(anchor, deltaX, deltaY)
      ),
      menu: translateEditorUITableChromeAnchor(
        fragment.menu,
        deltaX,
        deltaY
      )
    }))
  };
}

/**
 * Projects viewport Table chrome into one workspace's scrolling coordinates.
 *
 * The resulting model can be mounted as an absolute child of the workspace.
 * Browser scrolling then composites pages and chrome together without waiting
 * for a JavaScript scroll listener or a reactive DOM patch.
 *
 * @param model - Latest viewport-projected Table chrome.
 * @param workspaceRect - Workspace border-box rectangle in viewport space.
 * @param scrollLeft - Current workspace horizontal scroll offset.
 * @param scrollTop - Current workspace vertical scroll offset.
 * @param clientLeft - Workspace left border width.
 * @param clientTop - Workspace top border width.
 * @returns Chrome model in workspace scrolling coordinates.
 */
export function projectEditorUITableChromeModelToScrollSpace(
  model: QuireMountedTableChromeModel,
  workspaceRect: QuireMountedCapabilityRect,
  scrollLeft: number,
  scrollTop: number,
  clientLeft: number,
  clientTop: number
): QuireMountedTableChromeModel {
  return translateEditorUITableChromeModel(
    model,
    scrollLeft - workspaceRect.left - clientLeft,
    scrollTop - workspaceRect.top - clientTop
  );
}

/**
 * Translates one viewport Table chrome anchor.
 *
 * @param anchor - Anchor to translate.
 * @param deltaX - Horizontal viewport displacement.
 * @param deltaY - Vertical viewport displacement.
 * @returns Anchor with translated viewport geometry.
 */
function translateEditorUITableChromeAnchor(
  anchor: QuireMountedTableChromeAnchor,
  deltaX: number,
  deltaY: number
): QuireMountedTableChromeAnchor {
  return {
    ...anchor,
    rect: translateEditorUITableChromeRect(anchor.rect, deltaX, deltaY)
  };
}

/**
 * Translates one viewport rectangle without changing its extent.
 *
 * @param rect - Rectangle to translate.
 * @param deltaX - Horizontal viewport displacement.
 * @param deltaY - Vertical viewport displacement.
 * @returns Translated viewport rectangle.
 */
function translateEditorUITableChromeRect(
  rect: QuireMountedCapabilityRect,
  deltaX: number,
  deltaY: number
): QuireMountedCapabilityRect {
  return {
    left: rect.left + deltaX,
    right: rect.right + deltaX,
    top: rect.top + deltaY,
    bottom: rect.bottom + deltaY
  };
}

/**
 * Builds workspace-scroll positioning for one reorder target guide.
 *
 * @param preview - Current reorder boundary preview.
 * @returns CSS positioning for the active-axis guide.
 */
export function createEditorUITableMoveGuideStyle(
  preview: EditorUITableMovePreview
): CSSProperties {
  return preview.axis === "row"
    ? {
        left: `${preview.tableRect.left}px`,
        top: `${preview.position - 1}px`,
        width: `${preview.tableRect.right - preview.tableRect.left}px`,
        height: "2px"
      }
    : {
        left: `${preview.position - 1}px`,
        top: `${preview.tableRect.top}px`,
        width: "2px",
        height: `${preview.tableRect.bottom - preview.tableRect.top}px`
      };
}
