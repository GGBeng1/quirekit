import type {
  QuireClipCommand,
  QuireDisplayCommand,
  QuireRect
} from "@quirekit/renderer";
import { translateQuireDisplayCommand } from "@quirekit/renderer";
import type { QuireDrawingControllerIdentity } from "@quirekit/view-engine";
import type { MountedDrawingStoryContent } from "./types";

const drawingStoryResizeClipPrefix = "mounted-drawing-resize-story-clip:";

/**
 * Creates one stable transient clip around unscaled drawing-text paint.
 *
 * The accepted story commands retain glyph metrics and line breaks. Only their
 * origin follows the preview frame; the projected inner rectangle becomes the
 * current paint boundary so a shrinking text box cannot leak glyphs outside it.
 *
 * @param story - Accepted story paint and inner rectangle.
 * @param identity - Captured drawing occurrence identity.
 * @param acceptedFrame - Accepted outer drawing frame.
 * @param previewFrame - Current transient outer drawing frame.
 * @returns Clip command containing translated accepted story commands.
 */
export function createMountedDrawingStoryResizeClip(
  story: MountedDrawingStoryContent,
  identity: QuireDrawingControllerIdentity,
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuireClipCommand {
  const dx = previewFrame.x - acceptedFrame.x;
  const dy = previewFrame.y - acceptedFrame.y;
  return {
    id: createMountedDrawingStoryResizeClipId(identity),
    kind: "clip",
    rect: projectMountedDrawingStoryInnerRect(
      story.rect,
      acceptedFrame,
      previewFrame
    ),
    commands: story.commands.map((command) =>
      translateQuireDisplayCommand(command, dx, dy)
    ),
    layer: readStoryLayer(story.commands)
  };
}

/**
 * Creates the stable command id shared by repeated preview frames and restore.
 *
 * @param identity - Captured drawing occurrence identity.
 * @returns Stable transient clip command id.
 */
export function createMountedDrawingStoryResizeClipId(
  identity: QuireDrawingControllerIdentity
): string {
  return `${drawingStoryResizeClipPrefix}${identity.objectId}:${identity.visualInstanceId ?? "single"}`;
}

/**
 * Projects an accepted inner text rectangle into a resized outer frame.
 *
 * Insets remain fixed rather than scaling with the frame. When the frame becomes
 * smaller than opposing insets, the clip collapses to zero area inside the frame.
 *
 * @param acceptedInnerRect - Accepted inner text rectangle.
 * @param acceptedFrame - Accepted outer drawing frame.
 * @param previewFrame - Current transient outer drawing frame.
 * @returns Preview inner rectangle constrained to the preview frame.
 */
export function projectMountedDrawingStoryInnerRect(
  acceptedInnerRect: QuireRect,
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuireRect {
  const leftInset = Math.max(0, acceptedInnerRect.x - acceptedFrame.x);
  const topInset = Math.max(0, acceptedInnerRect.y - acceptedFrame.y);
  const rightInset = Math.max(
    0,
    acceptedFrame.x + acceptedFrame.width
      - acceptedInnerRect.x
      - acceptedInnerRect.width
  );
  const bottomInset = Math.max(
    0,
    acceptedFrame.y + acceptedFrame.height
      - acceptedInnerRect.y
      - acceptedInnerRect.height
  );
  const right = previewFrame.x + previewFrame.width;
  const bottom = previewFrame.y + previewFrame.height;
  const x = Math.min(right, previewFrame.x + leftInset);
  const y = Math.min(bottom, previewFrame.y + topInset);

  return {
    x,
    y,
    width: Math.max(0, right - rightInset - x),
    height: Math.max(0, bottom - bottomInset - y)
  };
}

/**
 * Reads the retained paint layer for the transient clip wrapper.
 *
 * @param commands - Accepted story commands.
 * @returns First authored command layer, or the content lane fallback.
 */
function readStoryLayer(
  commands: readonly QuireDisplayCommand[]
): NonNullable<QuireDisplayCommand["layer"]> {
  return commands[0]?.layer ?? "content";
}
