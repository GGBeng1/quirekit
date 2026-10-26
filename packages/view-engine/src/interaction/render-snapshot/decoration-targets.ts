import type { QuireViewTarget } from "@quirekit/renderer";
import type { QuireDecorationLanes } from "../../decorations";

/**
 * Creates qkView targets for cursor-bearing decoration rectangles.
 *
 * Decoration attributes are presentation metadata only. Executable targets
 * must arrive through typed `quireInteractions`, which are appended below.
 *
 * @param lanes - Decoration lanes produced for the current render pass.
 * @returns Decoration targets in decoration paint order.
 */
export function createQuireDecorationCursorTargets(
  lanes: QuireDecorationLanes
): readonly QuireViewTarget[] {
  return [
    ...lanes.backgrounds.flatMap((visual) => {
      if (visual.cursor === undefined) return [];
      const controlKind = visual.attrs["data-qk-decoration-control"];
      const controlPart = visual.attrs["data-qk-decoration-control-part"];
      const ownerKind = visual.attrs["data-qk-decoration-owner-kind"];
      const ownerId = visual.attrs["data-qk-decoration-owner-id"];

      return [{
        id: `decoration-cursor:${visual.id}`,
        nodePath: `decoration-cursor/${visual.id}`,
        rect: visual.rect,
        range: visual.range,
        role: controlKind ?? "document-decoration",
        part: typeof controlPart === "string" && controlPart.length > 0
          ? controlPart
          : "cursor",
        owner: {
          kind: ownerKind ?? "decoration",
          id: ownerId ?? visual.decorationId
        },
        pointerEvents: "auto" as const,
        cursor: visual.cursor,
        events: {}
      }];
    }),
    // Typed semantic targets are appended last so they win same-geometry hit
    // ordering over passive cursor-only visuals.
    ...lanes.interactionTargets
  ];
}
