import type { QuireEditorState } from "@quirekit/core";
import {
  collectQuireProseMirrorContainerBlockInputs,
  type QuireProseMirrorBlockInputOptions
} from "../../prosemirror";
import { layoutQuireBlockContainer } from "../../../layout/engine";
import {
  collectQuireInlineSourceLayoutAnchors
} from "../../../layout/engine/inline/source-anchor";
import {
  collectQuireInlineSourceCapabilitySidecars
} from "../../../layout/engine/inline/source-capability";
import type { QuireLayoutProviderExecutionLifecycle } from "../../../layout/providers";
import {
  compileQuireRetainedRegionProductSet
} from "../../../layout/region-products";
import {
  createQuireDefaultViewCapabilities,
  createQuireDefaultViewRegion,
  createQuireDefaultViewRoot
} from "../../../layout/view-graph";
import type { QuireAuxiliaryStory, QuirePageModelProfile } from "../../../document-profile/types";
import type { QuirePageBandStorySourceLayout } from "./types";

/** Options for compiling page-band stories into canonical layout. */
export interface CompileQuirePageBandStorySourcesOptions {
  /** Editor state containing the shared body and auxiliary-story document. */
  readonly state: QuireEditorState;
  /** Block-input services shared with the body source collection pass. */
  readonly blockInputOptions: QuireProseMirrorBlockInputOptions;
  /** Story inline width in CSS pixels. */
  readonly width: number;
  /** Default leaf block height used by recursive block layout. */
  readonly blockHeight: number;
  /** Vertical gap between story blocks. */
  readonly blockGap: number;
  /** Active provider lifecycle allocated for this snapshot pass. */
  readonly providerExecutionLifecycle: QuireLayoutProviderExecutionLifecycle;
  /** Page semantics listing the document's auxiliary stories. */
  readonly pageModel: QuirePageModelProfile;
}

/**
 * Compiles page-band stories once in story-local coordinates.
 *
 * @param options - Shared source services, geometry, and provider authority.
 * @returns Canonical source layouts keyed by stable persisted story ids.
 */
export function compileQuirePageBandStorySources(
  options: CompileQuirePageBandStorySourcesOptions
): readonly QuirePageBandStorySourceLayout[] {
  const sources: QuirePageBandStorySourceLayout[] = [];

  for (const story of options.pageModel.listStories(options.state.doc)) {
    const band = story.kind;
    if (band !== "header" && band !== "footer") {
      continue;
    }
    sources.push({ storyId: story.id, kind: band, ...compileQuireStorySourceLayout(story, band, options) });
  }

  return sources;
}

/** Measured layout, anchors and capabilities compiled for one auxiliary story. */
export interface QuireStorySourceLayout {
  /** Story-local measured layout with global document ranges. */
  readonly layout: QuirePageBandStorySourceLayout["layout"];
  /** Logical inline source anchors collected once from persisted story intent. */
  readonly anchors: QuirePageBandStorySourceLayout["anchors"];
  /** View capability sidecars paired with the logical story anchors. */
  readonly sourceCapabilities: QuirePageBandStorySourceLayout["sourceCapabilities"];
}

/**
 * Compiles one auxiliary story once in story-local coordinates.
 *
 * @param story - Story listed by the page model.
 * @param kind - View root and region kind of the story.
 * @param options - Shared source services, width, and provider authority.
 * @returns Measured layout with its view products, anchors and capabilities.
 */
export function compileQuireStorySourceLayout(
  story: QuireAuxiliaryStory,
  kind: "header" | "footer" | "footnote" | "endnote",
  options: CompileQuirePageBandStorySourcesOptions
): QuireStorySourceLayout {
  const namespace = options.pageModel.storyNamespace;
  const band = kind;
  const inputs = collectQuireProseMirrorContainerBlockInputs(
    {
      node: story.node,
      contentStart: story.from,
      path: story.path
    },
    options.blockInputOptions
  );
  const source = {
    sourceId: `${namespace}:${story.id}`,
    range: {
      from: story.from,
      to: story.to
    }
  };
  const capabilities = createQuireDefaultViewCapabilities();
  const viewRoot = createQuireDefaultViewRoot({
    rootId: `root:${namespace}:${story.id}`,
    kind: band,
    sourceId: source.sourceId,
    range: source.range,
    capabilities
  });
  const viewRegion = createQuireDefaultViewRegion({
    rootId: viewRoot.id,
    regionId: `region:${namespace}:${story.id}`,
    kind: band
  });
  const baseLayout = layoutQuireBlockContainer({
    id: `${namespace}:${story.id}`,
    range: source.range,
    rect: { x: 0, y: 0, width: options.width, height: 0 },
    blockHeight: options.blockHeight,
    blockGap: options.blockGap,
    children: inputs,
    viewRoot,
    viewRegion,
    viewCapabilities: capabilities,
    providerExecutionLifecycle: options.providerExecutionLifecycle
  });
  const regionProducts = compileQuireRetainedRegionProductSet([{
    producerId: "page-band-story-source-layout",
    sourceKind: `${band}-story`,
    source,
    root: {
      rootId: viewRoot.id.value,
      kind: band,
      source,
      capabilities
    },
    regions: [{
      regionId: viewRegion.regionId.value,
      kind: band,
      source,
      rect: baseLayout.rect,
      coordinateSpace: "document",
      capabilities
    }],
    selectionPolicies: [{
      policyId: `${namespace}:${story.id}:text`,
      regionId: viewRegion.regionId.value,
      kind: "delegate-to-text"
    }]
  }]);

  const layoutOwner = { region: viewRegion, source, capabilities };
  return {
    layout: { ...baseLayout, regionProducts, layoutOwner },
    anchors: collectQuireInlineSourceLayoutAnchors(baseLayout, layoutOwner),
    sourceCapabilities: collectQuireInlineSourceCapabilitySidecars(baseLayout)
  };
}
