import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireContentClip } from "./types";

/**
 * Creates the persistent inner-frame and page clips for a drawing occurrence.
 * @param root - Attached drawing-text root paired with an accepted object.
 * @returns Stable occurrence-specific clip descriptor.
 */
export function createDrawingTextContentClip(root: QuireLayoutNode): QuireContentClip {
  const region = root.layoutOwner?.region;
  return {
    id: ["drawing-text-content-clip", region?.rootId.value ?? root.id,
      region?.visualInstanceId ?? "single"].join(":"),
    rect: root.rect,
    ...(root.paintOpacity === undefined ? {} : { opacity: root.paintOpacity }),
    ...(root.paintClipRect === undefined ? {} : { pageRect: root.paintClipRect }),
    ...(root.paintTransform === undefined ? {} : {
      transform: root.paintTransform,
      visualBounds: root.paintBounds ?? root.rect
    })
  };
}

/**
 * Emits a direct-owner batch inside the same clips as the composite paint tree.
 * @param commands - Mutable directly owned command sink.
 * @param node - Exact layout node owning the batch.
 * @param contentClip - Optional story-level paint boundaries.
 * @param append - Callback producing the unclipped owned commands.
 */
export function appendContentCommandBatch(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  contentClip: QuireContentClip | undefined,
  append: (commands: QuireDisplayCommand[]) => void
): void {
  if (contentClip === undefined) {
    append(commands);
    return;
  }
  const clippedCommands: QuireDisplayCommand[] = [];
  append(clippedCommands);
  if (clippedCommands.length === 0) return;
  const layer = clippedCommands[0]?.layer;
  const inner: QuireDisplayCommand = {
    id: `${contentClip.id}:${node.id}`,
    kind: "clip",
    rect: contentClip.rect,
    ...(contentClip.opacity === undefined ? {} : { opacity: contentClip.opacity }),
    ...(contentClip.transform === undefined ? {} : {
      transform: contentClip.transform,
      visualBounds: contentClip.visualBounds ?? contentClip.rect
    }),
    commands: clippedCommands,
    ...(layer === undefined ? {} : { layer })
  };
  // The page is an untransformed outer boundary. Applying it inside the text
  // transform would rotate the paper and let adjacent occurrences paint here.
  commands.push(contentClip.pageRect === undefined ? inner : {
    id: `drawing-text-page-clip:${contentClip.id}:${node.id}`,
    kind: "clip",
    rect: contentClip.pageRect,
    commands: [inner],
    ...(layer === undefined ? {} : { layer })
  });
}
