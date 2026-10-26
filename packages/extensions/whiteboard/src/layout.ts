import { qkView } from "@quirekit/renderer";
import { formatQuireMediaResourceKey } from "@quirekit/media";
import { createQuireLayoutProviderRegistration, type QuireLayoutProviderContext, type QuireLayoutProviderOutput } from "@quirekit/view-engine/layout-provider";
import { readWhiteboardNode } from "./source";
import { whiteboardPreviewSize } from "@quirekit/whiteboard";

/** @returns Public retained-region registration, shared by Canvas and SVG document views. */
export function whiteboardLayout() {
  return { ...createQuireLayoutProviderRegistration({ id: "whiteboard-preview", nodeTypes: ["whiteboard"], capabilities: ["selection-domain", "semantic-export"],
    regionContract: { rootKind: "block-container", regionKind: "block-container", selectionPolicy: "object-selection",
      capabilities: { editable: false, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true } }, layout }),
    layoutDependency: { kind: "document" as const } };
}
/** @param context - Framework-owned range, identity and constraints. @returns Static preview at one accepted document rectangle. */
function layout(context: QuireLayoutProviderContext): QuireLayoutProviderOutput {
  const range = context.source.range; if (!range) throw new Error("Whiteboard requires a source range");
  const board = readWhiteboardNode(context.sourceNode);
  const size = whiteboardPreviewSize(board?.preview ?? null, context.constraints.inlineSize), width = size.width;
  const rect = { ...context.constraints.origin, ...size };
  const owner = { root: context.root, region: context.region };
  const exportFallbacks = [{ kind: "native", targetFormat: "docx", sourceMetadata: { codec: "whiteboard" } },
    { kind: "plain-text", targetFormat: "plain-text", reason: "Whiteboard text export uses its title." }] as const;
  // The same accepted rectangle and portable bytes feed Canvas, SVG, PDF and
  // OFD. Browser decoding remains with the mounted media resource manager.
  const preview = board?.preview;
  const declaration = context.services.declareRegionProducts({ declaration: context.services.declarePrimaryRegion(rect), owner,
    layerContributions: [context.services.compileLayerContribution({ contributionId: "whiteboard-preview", owner, range, rect,
      coordinateSpace: "document", layer: { plane: "content" }, paintSurface: "content",
      node: preview ? qkView.customPaint({ width, height: rect.height,
        paint: (bounds, id) => [{ id, kind: "image", rect: bounds, sourceSize: { width: preview.width, height: preview.height },
          resourceKey: formatQuireMediaResourceKey({ kind: "external", href: preview.url ?? preview.dataUrl }) }] })
        : qkView.text({ text: board ? `白板：${board.title}` : "白板数据无效", style: { color: "#64748b" } }) })],
    interactionTargets: [{ targetId: "whiteboard-object", range, rect, coordinateSpace: "document", layer: { plane: "content" },
      pointerPolicy: { kind: "select", shouldFocusEditor: true, shouldPreventDefault: true }, intent: { kind: "object", objectId: board ? `whiteboard:${board.id}` : context.source.sourceId } }],
    semantics: { role: "object", label: board?.title ?? "白板", search: { kind: "excluded", reason: "Whiteboard source is an opaque drawing scene" } }, exportFallbacks });
  return { providerId: context.providerId, snapshotVersion: context.snapshotVersion, source: context.source,
    layout: context.services.createContribution({ id: context.source.sourceId, range, rect, owner, exportFallbacks }), declarations: [declaration], fragments: [], continuation: null };
}
