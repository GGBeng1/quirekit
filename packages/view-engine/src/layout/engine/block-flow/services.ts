import type { QuireBlockFlowBox, QuireBlockFlowServices } from "@quirekit/layout/block-flow";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutExportFallback,
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireBlockContainerLayoutOptions, QuireBlockLayoutInput } from "../block-types";
import type { QuireLayoutBox, QuireLayoutContainer } from "../types";
import type { QuireRetainedRegionProducts } from "../../region-products";
import {
  createQuireLayoutProviderExecutionLifecycle,
  executeQuireLayoutProviderHost,
  type QuireLayoutProviderExecutionLifecycle
} from "../../providers";
import { translateQuireRetainedRegionProducts } from "../pagination/projection/translate";

/**
 * Creates the directional View services consumed by neutral block flow.
 *
 * Provider execution and retained/capability sidecars remain here. The Layout
 * package receives only typed callbacks and canonical block geometry.
 *
 * @param options - View cache, dirty range, and provider lifecycle authority.
 * @param layoutContainer - Existing Engine container entry, passed without a circular import.
 * @returns Typed services for ordinary body and recursive cell flow.
 */
export function createQuireViewBlockFlowServices(
  options: Pick<QuireBlockContainerLayoutOptions,
    "dirtyRange" | "leafFlowCache" | "providerExecutionLifecycle">,
  layoutContainer: (request: QuireBlockContainerLayoutOptions) => QuireLayoutContainer
): QuireBlockFlowServices<QuireBlockLayoutInput, QuireLayoutBox> {
  return {
    cache: options.leafFlowCache,
    dirtyRange: options.dirtyRange,
    resolveChildren: (input) => input.children,
    isSpecialized: (input) => input.layoutProvider !== undefined,
    layoutSpecialized: (request) => {
      const sourceInput = request.input.layoutProvider;
      if (sourceInput === undefined) {
        return undefined;
      }

      const executionLifecycle = options.providerExecutionLifecycle
        ?? createOneShotProviderExecutionLifecycle(sourceInput.snapshotVersion);
      return executeQuireLayoutProviderHost({
        id: request.input.id,
        range: request.input.range,
        sourceInput,
        constraints: {
          origin: { x: request.x, y: request.y },
          inlineSize: request.width,
          blockSize: request.fragmentBlockSize === undefined
            ? { kind: "unbounded" }
            : { kind: "bounded", size: request.fragmentBlockSize },
          blockHeight: request.blockHeight,
          blockGap: request.blockGap,
          coordinateSpace: "document"
        },
        executionLifecycle,
        layoutBlockContainer: (containerRequest) => layoutContainer({
          ...containerRequest,
          fragmentBlockSize: request.fragmentBlockSize,
          dirtyRange: options.dirtyRange,
          leafFlowCache: options.leafFlowCache,
          providerExecutionLifecycle: executionLifecycle
        })
      });
    },
    decorateBox: (input, box: QuireBlockFlowBox): QuireLayoutBox => ({
      ...box,
      ...(input.inlineContentWidth === undefined ? {} : { inlineContentWidth: input.inlineContentWidth }),
      ...createQuireBlockInputViewGraphFields(input, box.rect.x, box.rect.y),
      ...(input.sourceCapabilities === undefined
        ? {}
        : { sourceCapabilities: input.sourceCapabilities }),
      ...(input.paragraphDecoration === undefined
        ? {}
        : { paragraphDecoration: input.paragraphDecoration }),
      ...(input.textFlowReflow === undefined
        ? {}
        : { textFlowReflow: input.textFlowReflow }),
      ...(input.flowExclusionGaps === undefined
        ? {}
        : { flowExclusionGaps: input.flowExclusionGaps })
    })
  };
}

/**
 * Projects textblock-local retained products into the placed block coordinate space.
 *
 * @param input - Source block input carrying local capability products.
 * @param x - Placed block x origin in the current layout space.
 * @param y - Placed block y origin in the current layout space.
 * @returns View-graph fields whose product geometry follows the placed block.
 */
function createQuireBlockInputViewGraphFields(
  input: QuireBlockLayoutInput,
  x: number,
  y: number
): ReturnType<typeof createQuireLayoutViewGraphFields> {
  const fields = createQuireLayoutViewGraphFields(input);
  if (input.regionProducts === undefined) return fields;
  return {
    ...fields,
    regionProducts: translateQuireRetainedRegionProducts(
      input.regionProducts,
      { dx: x, dy: y }
    )
  };
}

/**
 * Creates canonical lifecycle authority for a one-shot unretained layout call.
 *
 * Snapshot construction always supplies the retained-graph lifecycle. This
 * authority exists for standalone layout utilities and intentionally retains no
 * state after the call.
 *
 * @param snapshotVersion - Snapshot version bound to the one-shot source input.
 * @returns Active lifecycle that can execute exactly this snapshot.
 */
function createOneShotProviderExecutionLifecycle(
  snapshotVersion: number
): QuireLayoutProviderExecutionLifecycle {
  const lifecycle = createQuireLayoutProviderExecutionLifecycle();
  lifecycle.beginSnapshot(snapshotVersion);
  return lifecycle;
}

/**
 * Extracts retained view-graph fields from a layout input or container request.
 *
 * @param source - Layout source that may carry retained view-graph products.
 * @returns Retained view-graph fields to spread into a layout box.
 */
export function createQuireLayoutViewGraphFields(source: {
  readonly viewRoot?: QuireLayoutRoot | undefined;
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  readonly regionProducts?: QuireRetainedRegionProducts | undefined;
}): {
  readonly viewRoot?: QuireLayoutRoot | undefined;
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  readonly regionProducts?: QuireRetainedRegionProducts | undefined;
} {
  return {
    ...(source.viewRoot === undefined ? {} : { viewRoot: source.viewRoot }),
    ...(source.viewRegion === undefined ? {} : { viewRegion: source.viewRegion }),
    ...(source.viewCapabilities === undefined
      ? {}
      : { viewCapabilities: source.viewCapabilities }),
    ...(source.exportFallbacks === undefined
      ? {}
      : { exportFallbacks: source.exportFallbacks }),
    ...(source.regionProducts === undefined
      ? {}
      : { regionProducts: source.regionProducts })
  };
}
