import type { DrawingAnchorInput } from "@quirekit/drawing-geometry";
import type { QuireEditor } from "@quirekit/core";
import type {
  QuireDrawingControllerCommitIntent,
  QuireLayoutNode,
  QuireLayoutPage
} from "@quirekit/view-engine";
import { readMountedDrawingModel } from "../model";
import { findProjectedTextblockRect } from "../reanchor";
import type { MountedDrawingCreatedTextBox } from "../types";

/**
 * Commits one completed creation intent through the atomic Word command.
 *
 * @param editor - Editor receiving the one semantic transaction.
 * @param anchorPosition - Body position where the inline anchor is attached.
 * @param page - Page occurrence used as the placement reference.
 * @param layoutRoot - Accepted layout tree used to resolve the anchor paragraph.
 * @param identities - Preallocated anchor, drawing, and story identities.
 * @param intent - Final renderer-neutral creation intent.
 * @returns Whether the registered Word command accepted the creation.
 */
export function commitMountedWordDrawingTextBoxCreation(
  editor: QuireEditor,
  anchorPosition: number,
  page: QuireLayoutPage | undefined,
  layoutRoot: QuireLayoutNode | undefined,
  identities: MountedDrawingCreatedTextBox,
  intent: QuireDrawingControllerCommitIntent
): boolean {
  const model = readMountedDrawingModel(editor);
  if (intent.kind !== "create" || !editor.isEditable
    || (intent.drawingKind !== "horizontal-text-box" && intent.drawingKind !== "shape")
    || (intent.drawingKind === "shape" && intent.geometry === undefined)) return false;
  const placement = resolveTextBoxCreationPlacement(
    editor,
    anchorPosition,
    page,
    layoutRoot,
    intent.frame.rect
  );
  const shape = intent.drawingKind === "shape"
    ? model.createDrawing(identities.drawingId, intent.geometry?.kind === "preset" ? intent.geometry.preset : "rect")
    : undefined;
  return model.insertAnchor(editor, {
    kind: intent.drawingKind === "shape" ? "shape" : "text-box",
    position: anchorPosition,
    attrs: {
      objectId: identities.objectId,
      ...(shape?.textBody === null ? {} : { storyId: identities.storyId }),
      ...placement,
      drawing: {
        ...shape,
        ...(shape === undefined ? {} : { transform: { ...shape.transform, flipVertical: intent.flipVertical ?? false } }),
        ...(intent.geometry === undefined ? {} : { geometry: intent.geometry }),
        drawingId: identities.drawingId,
        kind: intent.drawingKind,
        extent: {
          width: intent.frame.rect.width,
          height: intent.frame.rect.height
        }
      },
      paintOrder: "in-front-of-text"
    }
  });
}

/**
 * Rebases accepted document geometry onto a valid Word placement policy.
 *
 * A body paragraph keeps the default move-with-text behavior through
 * column/paragraph-relative offsets. The fixed-page fallback is used only when
 * retained paragraph geometry is unavailable, so page-relative coordinates
 * never contradict the persisted movement policy.
 *
 * @param editor - Editor owning the source paragraph.
 * @param anchorPosition - Source position receiving the inline anchor.
 * @param page - Accepted page occurrence.
 * @param layoutRoot - Accepted layout tree.
 * @param frame - Final drawing rectangle in document space.
 * @returns Canonical movement and axis placement input.
 */
function resolveTextBoxCreationPlacement(
  editor: QuireEditor,
  anchorPosition: number,
  page: QuireLayoutPage | undefined,
  layoutRoot: QuireLayoutNode | undefined,
  frame: Readonly<{ x: number; y: number; width: number; height: number }>
): Pick<
  DrawingAnchorInput,
  "anchorMovement" | "horizontalPosition" | "verticalPosition"
> {
  if (page !== undefined && layoutRoot !== undefined) {
    const resolved = editor.state.pm.doc.resolve(anchorPosition);
    const paragraphStart = resolved.depth === 0
      ? 0
      : resolved.before(resolved.depth);
    const paragraphRect = findProjectedTextblockRect(
      layoutRoot,
      paragraphStart,
      page.pageRect
    );
    if (paragraphRect !== undefined) {
      return {
        anchorMovement: "move-with-text",
        horizontalPosition: {
          kind: "offset",
          relativeTo: "column",
          offset: frame.x - page.bodyRect.x
        },
        verticalPosition: {
          kind: "offset",
          relativeTo: "paragraph",
          offset: frame.y - paragraphRect.y
        }
      };
    }
  }
  if (page !== undefined) {
    return {
      anchorMovement: "fixed-on-page",
      horizontalPosition: {
        kind: "offset",
        relativeTo: "page",
        offset: frame.x - page.pageRect.x
      },
      verticalPosition: {
        kind: "offset",
        relativeTo: "page",
        offset: frame.y - page.pageRect.y
      }
    };
  }
  return {
    anchorMovement: "move-with-text",
    horizontalPosition: {
      kind: "offset",
      relativeTo: "column",
      offset: frame.x
    },
    verticalPosition: {
      kind: "offset",
      relativeTo: "paragraph",
      offset: frame.y
    }
  };
}
