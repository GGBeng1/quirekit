import { qkView } from "@quirekit/renderer";
import { formatQuireMediaResourceKey } from "@quirekit/media";
import { createQuireLayoutProviderRegistration, type QuireLayoutProviderContext, type QuireLayoutProviderOutput } from "@quirekit/view-engine/layout-provider";
import { readFlowchartNode } from "./source";

/** @returns Public retained-region registration, shared by Canvas and SVG document views. */
export function flowchartLayout() {
  return { ...createQuireLayoutProviderRegistration({ id: "flowchart-preview", nodeTypes: ["flowchart"], capabilities: ["selection-domain", "semantic-export"],
    regionContract: { rootKind: "block-container", regionKind: "block-container", selectionPolicy: "object-selection",
      capabilities: { editable: false, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true } }, layout }),
    layoutDependency: { kind: "document" as const } };
}
/** @param context - Framework-owned range, identity and constraints. @returns Static preview at one accepted document rectangle. */
function layout(context: QuireLayoutProviderContext): QuireLayoutProviderOutput {
  const range = context.source.range; if (!range) throw new Error("Flowchart requires a source range");
  const flow = readFlowchartNode(context.sourceNode);
  const ratio = flow?.preview ? flow.preview.height / flow.preview.width : 7 / 12;
  const width = Math.min(context.constraints.inlineSize, 720, 460 / ratio);
  const rect = { ...context.constraints.origin, width, height: width * ratio };
  const owner = { root: context.root, region: context.region };
  const exportFallbacks = [{ kind: "semantic-degraded", targetFormat: "docx", reason: "Flowchart exports as an image with optional source recovery, not native Word shapes." },
    { kind: "plain-text", targetFormat: "plain-text", reason: "Flowchart text export uses its title." }] as const;
  // The same accepted rectangle and portable bytes feed Canvas, SVG, PDF and
  // OFD. Browser decoding remains with the mounted media resource manager.
  const preview = flow?.preview;
  const declaration = context.services.declareRegionProducts({ declaration: context.services.declarePrimaryRegion(rect), owner,
    layerContributions: [context.services.compileLayerContribution({ contributionId: "flowchart-preview", owner, range, rect,
      coordinateSpace: "document", layer: { plane: "content" }, paintSurface: "content",
      node: preview ? qkView.customPaint({ width, height: rect.height,
        paint: (bounds, id) => [{ id, kind: "image", rect: bounds, sourceSize: { width: preview.width, height: preview.height },
          resourceKey: formatQuireMediaResourceKey({ kind: "external", href: preview.url ?? preview.dataUrl }) }] })
        : qkView.text({ text: flow ? `流程图：${flow.title}` : "流程图数据无效", style: { color: "#64748b" } }) })],
    interactionTargets: [{ targetId: "flowchart-object", range, rect, coordinateSpace: "document", layer: { plane: "content" },
      pointerPolicy: { kind: "select", shouldFocusEditor: true, shouldPreventDefault: true }, intent: { kind: "object", objectId: flow ? `flowchart:${flow.id}` : context.source.sourceId } }],
    semantics: { role: "object", label: flow?.title ?? "流程图", search: { kind: "excluded", reason: "Flowchart source is an opaque drawing scene" } }, exportFallbacks });
  return { providerId: context.providerId, snapshotVersion: context.snapshotVersion, source: context.source,
    layout: context.services.createContribution({ id: context.source.sourceId, range, rect, owner, exportFallbacks }), declarations: [declaration], fragments: [], continuation: null };
}
