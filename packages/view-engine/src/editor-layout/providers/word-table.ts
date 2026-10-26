import type { QuireTableModelProfile, QuireTableStyleContext } from "../../document-profile/types";
import {
  resolveQuireTableFloatingFlowFootprint,
  type QuireTableSource
} from "@quirekit/layout/table";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput,
  QuireLayoutProviderRegionDeclaration
} from "../../layout/providers";
import type { QuireLayoutBox } from "../../layout/engine/types";
import type { QuireSubLayoutProjection } from "../../layout/engine/sub-layout";
import { createQuireSubLayoutProjection } from "../../layout/engine/sub-layout";
import type { QuireTableProductCache } from "../../layout/cache/table";
import { createQuireWordTableProviderInput } from "../prosemirror/table";
import { layoutQuireTableProviderContribution } from "../../layout/engine/table/block-layout";

const editableCapabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/**
 * Creates the built-in grid table provider with optional retained products.
 *
 * Cache injection remains internal to snapshot registry construction. The
 * generic provider contract is not widened with a table-specific service.
 *
 * @param tableNodeType - Node type the table model lays out.
 * @param tableModel - Table model normalizing table nodes.
 * @param styleContext - Document table style context.
 * @param tableProductCache - Per-view table products, when retained layout is active.
 * @param fitToWidth - Whether overwide tables shrink into the available inline size.
 * @returns Built-in provider consumed through generic provider authority.
 */
export function createQuireWordGridLayoutProvider(
  tableNodeType: string,
  tableModel: QuireTableModelProfile,
  styleContext: QuireTableStyleContext,
  tableProductCache?: QuireTableProductCache,
  fitToWidth = false
): QuireLayoutProvider {
  return {
    id: "word-grid-flow",
    nodeTypes: [tableNodeType],
    capabilities: [
      "child-flow",
      "fragmentation",
      "selection-domain",
      "semantic-export"
    ],
    regionContract: {
      rootKind: "block-container",
      regionKind: "block-container",
      capabilities: editableCapabilities,
      selectionPolicy: "delegate-to-text"
    },
    layout: (context) => layoutWordGridProvider(context, tableModel, styleContext, tableProductCache, fitToWidth)
  };
}

/**
 * Produces the renderer-neutral grid table contribution and retained products.
 *
 * @param context - Framework-owned source, identity, constraints, and services.
 * @param tableModel - Table model normalizing table nodes.
 * @param styleContext - Document table style context.
 * @param tableProductCache - Optional retained products injected for the built-in provider.
 * @param fitToWidth - Whether overwide tables shrink into the available inline size.
 * @returns Provider output whose layout becomes the installed block product.
 */
function layoutWordGridProvider(
  context: QuireLayoutProviderContext,
  tableModel: QuireTableModelProfile,
  styleContext: QuireTableStyleContext,
  tableProductCache?: QuireTableProductCache,
  fitToWidth = false
): QuireLayoutProviderOutput {
  const range = context.source.range;
  if (range === undefined) {
    throw new RangeError("Word grid provider requires an explicit source range.");
  }
  const id = context.source.sourceId.replace(/^document-node:/u, "");
  const table = createQuireWordTableProviderInput({
    context,
    id,
    ...(tableProductCache === undefined ? {} : { tableProductCache }),
    tableModel,
    styleContext
  });
  const base = layoutQuireTableProviderContribution({
    table,
    x: context.constraints.origin.x,
    y: context.constraints.origin.y,
    width: context.constraints.inlineSize,
    fitToWidth,
    blockHeight: context.constraints.blockHeight,
    layoutBlockContainer: context.services.layoutBlockContainer,
    ...(tableProductCache === undefined ? {} : { tableProductCache })
  });
  const flowRect = createWordTableFlowRect(
    context,
    base.rect,
    table.source.floating
  );
  const tableExportFallbacks = [{
    kind: "native" as const,
    targetFormat: "docx" as const,
    reason: "Built-in Word table products preserve native table semantics."
  }];
  const declarations: QuireLayoutProviderRegionDeclaration[] = [
    context.services.declareRegionProducts({
      declaration: context.services.declarePrimaryRegion(base.rect),
      owner: { root: context.root, region: context.region },
      semantics: {
        role: "table",
        search: { kind: "source-text" }
      },
      exportFallbacks: tableExportFallbacks
    })
  ];
  const fragments: QuireSubLayoutProjection[] = [];
  const layout = retainNestedFlowIdentity(
    {
      ...base,
      rect: flowRect,
      exportFallbacks: tableExportFallbacks,
      viewRoot: context.root,
      viewRegion: context.region,
      viewCapabilities: context.root.capabilities
    },
    context,
    declarations,
    fragments
  );

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    layout,
    declarations,
    fragments,
    continuation: null
  };
}

/**
 * Creates the provider-owned block-flow footprint for one Word table.
 *
 * The table snapshot retains its authored visual rectangle, including legal
 * overflow beyond the text extent. The provider contribution itself stays
 * inside the authoritative flow constraint so generic validation and sibling
 * placement do not confuse visual overflow with consumed inline space.
 *
 * @param context - Framework-owned provider constraints.
 * @param visualRect - Authored table rectangle emitted by table layout.
 * @param floating - Optional floating placement used to derive flow exclusion.
 * @returns Constraint-owned block-flow rectangle with the visual block height.
 */
function createWordTableFlowRect(
  context: QuireLayoutProviderContext,
  visualRect: QuireLayoutBox["rect"],
  floating: QuireTableSource["floating"]
): QuireLayoutBox["rect"] {
  const floatingFootprint = floating == null
    ? null
    : resolveQuireTableFloatingFlowFootprint({
        placement: floating,
        tableWidth: visualRect.width,
        tableHeight: visualRect.height,
        containingInlineSize: context.constraints.inlineSize
      });

  return {
    x: context.constraints.origin.x,
    y: context.constraints.origin.y,
    width: context.constraints.inlineSize,
    height: floatingFootprint?.height ?? visualRect.height
  };
}

/**
 * Allocates retained identity for every nested child-flow fragment.
 *
 * @param box - Provider layout box to rewrite immutably.
 * @param context - Framework-owned provider context.
 * @param declarations - Mutable declaration accumulator.
 * @param fragments - Mutable fragment manifest accumulator.
 * @returns Layout box whose nested flows carry framework-allocated identities.
 */
function retainNestedFlowIdentity(
  box: QuireLayoutBox,
  context: QuireLayoutProviderContext,
  declarations: QuireLayoutProviderRegionDeclaration[],
  fragments: QuireSubLayoutProjection[]
): QuireLayoutBox {
  const subLayoutFragments = box.subLayoutFragments?.map((entry) => {
    const projection = entry.subLayout;
    const geometry = projection.geometry;
    const source = { sourceId: `${context.source.sourceId}:sub-layout:${geometry.root.id}`, range: geometry.root.range };
    const cell = geometry.root.kind === "table-cell";
    const exportFallbacks = [{
      kind: "native" as const,
      targetFormat: "docx" as const,
      reason: cell
        ? "Word table cell semantics remain native across page fragments."
        : "Nested table flow exports in canonical source order."
    }];
    const identity = context.services.allocateRootRegion({
      localId: geometry.root.id,
      sourceKind: geometry.root.kind,
      source,
      rootKind: cell ? "table-cell" : "block-container",
      regionKind: cell ? "table-cell" : "block-container",
      capabilities: editableCapabilities,
      rect: geometry.interactionClip,
      coordinateSpace: "document",
      selectionPolicy: "delegate-to-text",
      visualInstance: { kind: "repeated", visualInstanceId: geometry.id }
    });
    const retained = createQuireSubLayoutProjection({
      geometry,
      root: {
        ...projection.view.root,
        ownership: {
          status: "resolved",
          root: identity.root,
          owner: { region: identity.region, source, capabilities: identity.root.capabilities },
          exportFallbacks
        }
      },
      fragmentSources: projection.view.fragmentSources,
      queryProducts: projection.view.queryProducts,
      displayChunks: projection.view.displayChunks
    });

    declarations.push(context.services.declareRegionProducts({
      declaration: identity.declaration,
      owner: { root: identity.root, region: identity.region },
      semantics: { role: cell ? "cell" : "group", search: { kind: "source-text" } },
      exportFallbacks
    }));
    fragments.push(retained);
    return { subLayout: retained };
  });
  const children = "children" in box && Array.isArray(box.children)
    ? box.children.map((child) =>
        retainNestedFlowIdentity(child, context, declarations, fragments)
      )
    : undefined;

  return {
    ...box,
    ...(subLayoutFragments === undefined ? {} : { subLayoutFragments }),
    ...(children === undefined ? {} : { children })
  };
}
