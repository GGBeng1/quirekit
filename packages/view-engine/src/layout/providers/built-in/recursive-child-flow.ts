import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput
} from "../types";
import { collectQuireProviderChildFragments } from "../children";

const editableCapabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/** Built-in recursive container algorithm using canonical child block flow. */
export const quireRecursiveChildFlowProvider: QuireLayoutProvider = {
  id: "recursive-child-flow",
  nodeTypes: ["blockquote"],
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
  layout: layoutRecursiveChildFlow
};

/**
 * Lays out one recursive source container through framework block flow.
 *
 * @param context - Framework-owned source, identity, constraints, and services.
 * @returns Provider output installed as the source node's block contribution.
 */
function layoutRecursiveChildFlow(
  context: QuireLayoutProviderContext
): QuireLayoutProviderOutput {
  const range = context.source.range;
  if (range === undefined) {
    throw new RangeError(
      "Recursive child-flow provider requires an explicit source range."
    );
  }
  const id = context.source.sourceId.replace(/^document-node:/u, "");
  const children = context.services.collectBlockInputs({
    sourceIdentity: context.sourceIdentity,
    contentStart: context.sourceContentStart,
    path: context.sourcePath,
    inlineSize: context.constraints.inlineSize
  });
  const container = context.services.layoutBlockContainer({
    id,
    range,
    rect: {
      x: context.constraints.origin.x,
      y: context.constraints.origin.y,
      width: context.constraints.inlineSize,
      height: context.constraints.blockHeight
    },
    blockHeight: context.constraints.blockHeight,
    blockGap: context.constraints.blockGap,
    children
  });
  const layout = {
    ...container,
    rect: {
      ...container.rect,
      height: Math.max(context.constraints.blockHeight, container.rect.height)
    },
    viewRoot: context.root,
    viewRegion: context.region,
    viewCapabilities: context.root.capabilities,
    exportFallbacks: [{
      kind: "native" as const,
      targetFormat: "html" as const,
      reason: "Blockquote source order and quotation semantics remain native."
    }]
  };
  const primaryRegion = context.services.declareRegionProducts({
    declaration: context.services.declarePrimaryRegion(layout.rect),
    owner: { root: context.root, region: context.region },
    semantics: {
      role: "blockquote",
      search: { kind: "source-text" }
    },
    exportFallbacks: layout.exportFallbacks
  });

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    layout,
    declarations: [primaryRegion],
    fragments: collectQuireProviderChildFragments(layout),
    continuation: null
  };
}
