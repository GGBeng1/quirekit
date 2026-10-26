import { qkView } from "@quirekit/renderer";
import { formatQuireMediaResourceKey } from "@quirekit/media";
import { createQuireLayoutProviderRegistration, type QuireLayoutProviderContext, type QuireLayoutProviderOutput } from "@quirekit/view-engine/layout-provider";
import { readMindMapNode } from "./source";

/** @returns Public retained-region registration, shared by Canvas and SVG document views. */
export function mindMapLayout() {
  return { ...createQuireLayoutProviderRegistration({ id: "mindMap-preview", nodeTypes: ["mindMap"], capabilities: ["selection-domain", "semantic-export"],
    regionContract: { rootKind: "block-container", regionKind: "block-container", selectionPolicy: "object-selection",
      capabilities: { editable: false, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true } }, layout }),
    layoutDependency: { kind: "document" as const } };
}
/** @param context - Framework-owned range, identity and constraints. @returns Static preview at one accepted document rectangle. */
function layout(context: QuireLayoutProviderContext): QuireLayoutProviderOutput {
  const range = context.source.range; if (!range) throw new Error("MindMap requires a source range");
  const mind = readMindMapNode(context.sourceNode);
  const ratio = mind?.preview ? mind.preview.height / mind.preview.width : 7 / 12;
  const width = Math.min(context.constraints.inlineSize, 720, 460 / ratio);
  const rect = { ...context.constraints.origin, width, height: width * ratio };
  const owner = { root: context.root, region: context.region };
  const exportFallbacks = [{ kind: "semantic-degraded", targetFormat: "docx", reason: "Mind maps export as saved images or topic outlines with optional source recovery." },
    { kind: "plain-text", targetFormat: "plain-text", reason: "MindMap text export uses its title." }] as const;
  // The same accepted rectangle and portable bytes feed Canvas, SVG, PDF and
  // OFD. Browser decoding remains with the mounted media resource manager.
  const preview = mind?.preview;
  const declaration = context.services.declareRegionProducts({ declaration: context.services.declarePrimaryRegion(rect), owner,
    layerContributions: [context.services.compileLayerContribution({ contributionId: "mindMap-preview", owner, range, rect,
      coordinateSpace: "document", layer: { plane: "content" }, paintSurface: "content",
      node: preview ? qkView.customPaint({ width, height: rect.height,
        paint: (bounds, id) => [{ id, kind: "image", rect: bounds, sourceSize: { width: preview.width, height: preview.height },
          resourceKey: formatQuireMediaResourceKey({ kind: "external", href: preview.url ?? preview.dataUrl }) }] })
        : qkView.text({ text: mind ? `思维导图：${mind.title}` : "思维导图数据无效", style: { color: "#64748b" } }) })],
    interactionTargets: [{ targetId: "mindMap-object", range, rect, coordinateSpace: "document", layer: { plane: "content" },
      pointerPolicy: { kind: "select", shouldFocusEditor: true, shouldPreventDefault: true }, intent: { kind: "object", objectId: mind ? `mindMap:${mind.id}` : context.source.sourceId } }],
    semantics: { role: "object", label: mind?.title ?? "思维导图", search: { kind: "excluded", reason: "Topic search belongs to the separate mind map editor" } }, exportFallbacks });
  return { providerId: context.providerId, snapshotVersion: context.snapshotVersion, source: context.source,
    layout: context.services.createContribution({ id: context.source.sourceId, range, rect, owner, exportFallbacks }), declarations: [declaration], fragments: [], continuation: null };
}
