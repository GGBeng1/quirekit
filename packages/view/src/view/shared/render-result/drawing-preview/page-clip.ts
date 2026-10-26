import type {
  QuireDisplayCommand,
  QuireDisplayCommandLayer,
  QuireRect
} from "@quirekit/renderer";
import type { QuireDrawingControllerIdentity } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";

const previewPageClipPrefix = "mounted-drawing-preview-page-clip:";

/**
 * Resolves the immutable page rectangle for one captured drawing occurrence.
 *
 * @param previous - Accepted render result carrying page geometry.
 * @param identity - Captured drawing occurrence identity.
 * @returns Exact owning page rectangle, or undefined outside pagination.
 */
export function resolveMountedDrawingPreviewPageRect(
  previous: QuireViewRenderResult,
  identity: QuireDrawingControllerIdentity
): QuireRect | undefined {
  const pageIndexText = identity.visualInstanceId
    ?.match(/(?:^|:)page:(\d+)(?::|$)/u)?.[1];
  if (pageIndexText === undefined) {
    return undefined;
  }
  const pageIndex = Number(pageIndexText);
  return previous.layoutSnapshot.pages?.find((page) =>
    page.pageIndex === pageIndex
  )?.pageRect
    ?? previous.pageDisplayListChunks?.chunks.find((chunk) =>
      chunk.pageIndex === pageIndex
    )?.pageRect;
}

/**
 * Wraps transient commands in a page-space clip that never follows the object.
 *
 * @param commands - Moved or resized object commands.
 * @param pageRect - Immutable owning page rectangle.
 * @param identity - Captured drawing identity used for stable replacement ids.
 * @param layer - Content or overlay paint authority.
 * @returns One page-clipped command family, or the input when clipping is absent.
 */
export function clipMountedDrawingPreviewCommandsToPage(
  commands: readonly QuireDisplayCommand[],
  pageRect: QuireRect | undefined,
  identity: QuireDrawingControllerIdentity,
  layer: QuireDisplayCommandLayer
): readonly QuireDisplayCommand[] {
  if (commands.length === 0 || pageRect === undefined) {
    return commands;
  }
  return [{
    id: createMountedDrawingPreviewPageClipId(identity, layer),
    kind: "clip",
    layer,
    rect: pageRect,
    commands
  }];
}

/**
 * Removes the accepted page wrapper before object-local geometry is projected.
 *
 * @param commands - Accepted retained command family.
 * @returns Commands below the accepted anchored-occurrence page clip.
 */
export function unwrapMountedDrawingAcceptedPageClip(
  commands: readonly QuireDisplayCommand[]
): readonly QuireDisplayCommand[] {
  return commands.flatMap((command) =>
    command.kind === "clip" && command.id.endsWith(":page-clip")
      ? command.commands
      : [command]
  );
}

/**
 * Creates the stable transient page-wrapper id for exact command replacement.
 *
 * @param identity - Captured drawing identity.
 * @param layer - Content or overlay paint authority.
 * @returns Stable command id scoped to drawing, occurrence, and paint layer.
 */
export function createMountedDrawingPreviewPageClipId(
  identity: QuireDrawingControllerIdentity,
  layer: QuireDisplayCommandLayer
): string {
  return `${previewPageClipPrefix}${layer}:${identity.objectId}:${identity.drawingId}`;
}
