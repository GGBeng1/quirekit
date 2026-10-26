import type {
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeFragment
} from "@quirekit/core";
import type { CSSProperties } from "vue";
import type { EditorUITableResizePreview } from "./types";
import { editorUITableChromeOutset } from "./constraints";

/**
 * Builds workspace-scroll positioning for one insertion boundary.
 *
 * @param anchor - Viewport-projected insertion anchor.
 * @param fragment - Active page-local Table fragment.
 * @returns CSS positioning for the compact plus control.
 */
export function createEditorUITableInsertionStyle(
  anchor: QuireMountedTableChromeAnchor,
  fragment: QuireMountedTableChromeFragment
): CSSProperties {
  return anchor.kind === "insert-row"
    ? {
        left: `${fragment.tableRect.left - editorUITableChromeOutset}px`,
        top: `${anchor.rect.top - 8}px`
      }
    : {
        left: `${anchor.rect.left - 8}px`,
        top: `${fragment.tableRect.top - editorUITableChromeOutset}px`
      };
}

/**
 * Builds the passive full-axis guide shown by an explicit insertion control.
 *
 * @param anchor - Viewport-projected insertion anchor.
 * @param fragment - Active page-local Table fragment.
 * @returns CSS positioning for the non-interactive insertion preview line.
 */
export function createEditorUITableInsertionGuideStyle(
  anchor: QuireMountedTableChromeAnchor,
  fragment: QuireMountedTableChromeFragment
): CSSProperties {
  return anchor.kind === "insert-row"
    ? {
        left: `${fragment.tableRect.left}px`,
        top: `${anchor.rect.top - 1}px`,
        width: `${fragment.tableRect.right - fragment.tableRect.left}px`,
        height: "2px"
      }
    : {
        left: `${anchor.rect.left - 1}px`,
        top: `${fragment.tableRect.top}px`,
        width: "2px",
        height: `${fragment.tableRect.bottom - fragment.tableRect.top}px`
      };
}

/**
 * Builds a full-axis hover guide for one real segmented resize target.
 *
 * @param anchor - Viewport-projected semantic resize segment.
 * @param fragment - Active page-local Table fragment.
 * @returns CSS positioning for the pointer-transparent resize preview line.
 */
export function createEditorUITableResizeHoverGuideStyle(
  anchor: QuireMountedTableChromeAnchor,
  fragment: QuireMountedTableChromeFragment
): CSSProperties {
  return anchor.kind === "resize-row"
    ? {
        left: `${fragment.tableRect.left}px`,
        top: `${anchor.rect.top - 1}px`,
        width: `${fragment.tableRect.right - fragment.tableRect.left}px`,
        height: "2px"
      }
    : {
        left: `${anchor.rect.left - 1}px`,
        top: `${fragment.tableRect.top}px`,
        width: "2px",
        height: `${fragment.tableRect.bottom - fragment.tableRect.top}px`
      };
}

/**
 * Builds workspace-scroll positioning for one trailing-edge resize hit.
 *
 * @param anchor - Viewport-projected resize anchor.
 * @returns CSS positioning for the row or column boundary hit target.
 */
export function createEditorUITableResizeHandleStyle(
  anchor: QuireMountedTableChromeAnchor
): CSSProperties {
  return anchor.kind === "resize-row"
    ? {
        left: `${anchor.rect.left}px`,
        top: `${anchor.rect.top - 4}px`,
        width: `${anchor.rect.right - anchor.rect.left}px`,
        height: "8px"
      }
    : {
        left: `${anchor.rect.left - 4}px`,
        top: `${anchor.rect.top}px`,
        width: "8px",
        height: `${anchor.rect.bottom - anchor.rect.top}px`
      };
}

/**
 * Builds workspace-scroll positioning for the resize preview guide.
 *
 * @param preview - Current clamped resize preview.
 * @returns CSS positioning for the active-axis guide.
 */
export function createEditorUITableResizeGuideStyle(
  preview: EditorUITableResizePreview
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
