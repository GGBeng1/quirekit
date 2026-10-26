import { measureDrawingTextWidth } from "./fit";
import { collectDrawingTextCandidates } from "./candidates";
import { clipDrawingTextLayout } from "./clip";
import { collectQuireProseMirrorContainerBlockInputs } from "../../prosemirror";
import { layoutQuireBlockContainer } from "../../../layout/engine";
import { compileQuireRetainedRegionProductSet } from "../../../layout/region-products";
import { createQuireDefaultViewCapabilities, createQuireDefaultViewRegion, createQuireDefaultViewRoot } from "../../../layout/view-graph";
import type { CompileQuireWordDrawingTextStorySourcesOptions, QuireWordDrawingTextStorySourceLayout } from "./types";

/**
 * Compiles every valid drawing text story in story-local coordinates.
 *
 * Missing, wrong-kind, and non-text drawing references remain capability gaps:
 * this compiler deliberately emits no inferred anchor text or DOM fallback.
 *
 * @param options - Shared source services and provider authority.
 * @returns Canonical source layouts keyed by stable object and story ids.
 */
export function compileQuireWordDrawingTextStorySources(
  options: CompileQuireWordDrawingTextStorySourcesOptions
): readonly QuireWordDrawingTextStorySourceLayout[] {
  const stories = new Map(options.pageModel.listStories(options.state.doc).map((story) => [story.id, story]));
  const candidates = collectDrawingTextCandidates(options.state, options.drawingModel);
  const sources: QuireWordDrawingTextStorySourceLayout[] = [];

  for (const candidate of candidates) {
    const story = stories.get(candidate.storyId);
    if (story === undefined || story.kind !== "textBox") {
      continue;
    }

    let measureWidth = candidate.fitFrame ? 1_000_000_000 : candidate.width;
    /** @returns Inputs at the current unwrapped or fitted measurement width. */
    const collectInputs = () => {
      return collectQuireProseMirrorContainerBlockInputs(
        { node: story.node, contentStart: story.from, path: story.path },
        { ...options.blockInputOptions, width: measureWidth,
          ...(candidate.fitFrame ? { lineBreakMode: "none" as const } : {}) }
      );
    };
    const source = {
      sourceId: `${options.pageModel.storyNamespace}:${story.id}`,
      range: { from: story.from, to: story.to }
    };
    const capabilities = createQuireDefaultViewCapabilities();
    const viewRoot = createQuireDefaultViewRoot({
      rootId: `root:word-drawing-text:${candidate.objectId}`,
      kind: "drawing-text",
      sourceId: source.sourceId,
      range: source.range,
      capabilities
    });
    const viewRegion = createQuireDefaultViewRegion({
      rootId: viewRoot.id,
      regionId: `region:word-drawing-text:${candidate.objectId}`,
      kind: "drawing-text"
    });
    /** @returns Full measured layout without truncating lines to the shape height. */
    const measure = () => layoutQuireBlockContainer({
      id: `word-drawing-text:${candidate.objectId}`,
      range: source.range,
      rect: { x: 0, y: 0, width: measureWidth, height: 0 },
      blockHeight: options.blockHeight,
      blockGap: options.blockGap,
      children: collectInputs(),
      viewRoot,
      viewRegion,
      viewCapabilities: capabilities,
      providerExecutionLifecycle: options.providerExecutionLifecycle
    });
    let measured = measure();
    if (candidate.fitFrame) {
      // Fit consumes the complete natural layout; centering is recomputed at its real width.
      measureWidth = measureDrawingTextWidth(measured);
      measured = measure();
    }
    const clipped = candidate.fitFrame ? measured : clipDrawingTextLayout(measured, candidate.height);
    const acceptedRect = {
      x: 0,
      y: 0,
      width: candidate.fitFrame ? measureWidth : candidate.width,
      height: candidate.fitFrame ? Math.max(1, measured.rect.height) : candidate.height
    };
    const regionProducts = compileQuireRetainedRegionProductSet([{
      producerId: "word-drawing-text-source-layout",
      sourceKind: "drawing-text-story",
      source,
      root: {
        rootId: viewRoot.id.value,
        kind: "drawing-text",
        source,
        capabilities
      },
      regions: [{
        regionId: viewRegion.regionId.value,
        kind: "drawing-text",
        source,
        rect: acceptedRect,
        coordinateSpace: "document",
        capabilities
      }],
      selectionPolicies: [{
        policyId: `word-drawing-text:${candidate.objectId}:text`,
        regionId: viewRegion.regionId.value,
        kind: "delegate-to-text"
      }]
    }]);

    sources.push({
      ...candidate,
      layout: {
        ...clipped,
        rect: acceptedRect,
        regionProducts,
        layoutOwner: { region: viewRegion, source, capabilities }
      }
    });
  }

  return sources;
}
