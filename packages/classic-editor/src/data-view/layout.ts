import { dataViewPaint } from "./paint";
import { createQuireLayoutProviderRegistration, type QuireLayoutProviderContext, type QuireLayoutProviderOutput } from "@quirekit/view-engine/layout-provider";
import { dataViewPreview, type DataViewPreview } from "@quirekit/data-view";

const previews = new WeakMap<object, DataViewPreview>();
/** @returns Document-dependent retained geometry for one static data object. */
export function dataViewLayout() {
  return {...createQuireLayoutProviderRegistration({id: "data-view-preview", nodeTypes: ["dataView"], capabilities: ["selection-domain", "semantic-export"],
    regionContract: {rootKind: "block-container", regionKind: "block-container", selectionPolicy: "object-selection",
      capabilities: {editable: false, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true}}, layout}),
    layoutDependency: {kind: "document" as const}};
}
/** Converts immutable source into document-space summary geometry once per source identity.
 * @param context - Engine-owned source, origin and constraints.
 * @returns Retained layout and interaction products.
 */
function layout(context: QuireLayoutProviderContext): QuireLayoutProviderOutput {
  const range = context.source.range; if (!range) throw new Error("Data view requires a document range");
  let preview = previews.get(context.sourceNode);
  if (!preview) {
    try { preview = dataViewPreview(context.sourceNode.attrs.dataView); }
    catch { preview = {title: "多维表格", rows: [], notice: "格式暂不支持，原始数据已保留"}; }
    previews.set(context.sourceNode, preview);
  }
  // The summary is cached by immutable source identity. Placement and the text
  // primitive compiler alone own document coordinates and width-dependent clipping.
  const width = Math.min(640, context.constraints.inlineSize), rect = {...context.constraints.origin, width, height: 76 + preview.rows.length * 34};
  const owner = {root: context.root, region: context.region};
  const exportFallbacks = [{kind: "semantic-degraded", targetFormat: "docx", reason: "Data views require a separately installed export codec; the document retains the complete source."},
    {kind: "plain-text", targetFormat: "plain-text", reason: "Data view plain text contains a label, not the complete dataset."}] as const;
  const declaration = context.services.declareRegionProducts({declaration: context.services.declarePrimaryRegion(rect), owner,
    layerContributions: [context.services.compileLayerContribution({contributionId: "data-view-preview", owner, range, rect, coordinateSpace: "document", layer: {plane: "content"}, paintSurface: "content",
      node: dataViewPaint(preview, width)})],
    interactionTargets: [{targetId: "data-view-object", range, rect, coordinateSpace: "document", layer: {plane: "content"}, pointerPolicy: {kind: "select", shouldFocusEditor: true, shouldPreventDefault: true}, intent: {kind: "object", objectId: context.source.sourceId}}],
    semantics: {role: "object", label: "多维表格，双击编辑", search: {kind: "excluded", reason: "Data source records are edited in the shared workspace"}}, exportFallbacks});
  return {providerId: context.providerId, snapshotVersion: context.snapshotVersion, source: context.source,
    layout: context.services.createContribution({id: context.source.sourceId, range, rect, owner, exportFallbacks}), declarations: [declaration], fragments: [], continuation: null};
}
