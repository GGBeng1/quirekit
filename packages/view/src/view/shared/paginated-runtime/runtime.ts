import type { QuireViewRenderResult } from "../../types";
import {
  createMountedViewInteractionLifecycle,
  createMountedViewScheduledUpdateLifecycle
} from "../lifecycle";
import {
  createMountedPaginatedGeometryFacade,
  createMountedPaginatedTransientPresentation,
  type MountedPaginatedTransientPresentation
} from "../paginated-facade";
import {
  createMountedPaginatedRenderFlow,
  type MountedPaginatedRenderFlow
} from "../paginated-render-flow";
import type {
  CreateMountedPaginatedRuntimeOptions,
  MountedPaginatedRuntime,
  MountedPaginatedViewRenderReason
} from "./types";

/**
 * Creates the canonical shared ownership root for one paginated mounted view.
 *
 * The returned object exposes the existing focused lifecycle resources instead
 * of copying their APIs onto another facade. Canvas and SVG therefore share one
 * assembly and teardown order while each resource keeps one reason to change.
 *
 * @param options - Explicit backend capabilities consumed by shared ownership.
 * @returns Mounted runtime with one result, interaction, and update authority.
 */
export function createMountedPaginatedRuntime(
  options: CreateMountedPaginatedRuntimeOptions
): MountedPaginatedRuntime {
  let currentRenderResult: QuireViewRenderResult | undefined;
  let renderFlow:
    | MountedPaginatedRenderFlow<MountedPaginatedViewRenderReason>
    | undefined;
  let presentation: MountedPaginatedTransientPresentation | undefined;
  let destroyed = false;

  // Scheduling is constructed first, but cannot execute until the remaining
  // runtime resources exist. Early execution is an ownership gap, not a state
  // that should be hidden behind a fallback.
  const updates = createMountedViewScheduledUpdateLifecycle({
    ...options.scheduling,
    execute: (update) => {
      requireRuntimeResource(renderFlow, "render flow").renderUpdate(update);
    }
  });
  const interaction = createMountedViewInteractionLifecycle({
    ...options.interaction.lifecycle,
    getInteractionSnapshot: () => currentRenderResult?.interactionSnapshot,
    onDrawingPreviewChange: (state) => {
      requireRuntimeResource(presentation, "transient presentation")
        .setDrawingPreview(state);
    },
    render: (reason, imePreedit) => {
      updates.request({
        reason,
        ...(imePreedit === undefined ? {} : { imePreedit })
      });
    },
    onFocusChange: (focused) => {
      requireRuntimeResource(presentation, "transient presentation")
        .setFocused(focused);
      options.interaction.onFocusChange?.(focused);
    }
  });
  const geometry = createMountedPaginatedGeometryFacade({
    ...options.geometry,
    readRenderResult: () => currentRenderResult,
    readSelectionContext: () => interaction.getSelectionGeometryContext()
  });

  // Transient and full-document commits share the same result slot and widget
  // target authority, so geometry, input, selection, and widgets cannot observe
  // different revisions.
  presentation = createMountedPaginatedTransientPresentation({
    ...options.presentation.lifecycle,
    readRenderResult: () => currentRenderResult,
    commitRenderResult: (renderResult) => {
      currentRenderResult = renderResult;
      interaction.refreshHeaderFooterEditingChrome();
      interaction.refreshDrawingContextualCommands();
      interaction.refreshCreatedDrawingTextEntry();
    },
    readSelectionContext: () => interaction.getSelectionGeometryContext(),
    setWidgetTargets: (renderResult) => {
      interaction.widgetEvents.setTargets(renderResult.viewTargets);
    },
    syncInputProxy: (renderResult) => {
      options.presentation.syncInputProxy(
        renderResult,
        requireRuntimeResource(renderFlow, "render flow").imePreedit
      );
    }
  });
  renderFlow = createMountedPaginatedRenderFlow({
    ...options.renderFlow.lifecycle,
    canReuseSelectionUpdate: (reason, request) =>
      options.renderFlow.allowsSelectionReuse()
      && presentation?.canReuseSelectionUpdate(reason, request) === true,
    renderSelectionUpdate: (reason, updatePatch) => {
      requireRuntimeResource(presentation, "transient presentation")
        .renderSelectionUpdate(reason, updatePatch);
    },
    canRefreshDocument: () =>
      currentRenderResult !== undefined
      && options.renderFlow.isDocumentPresentationReady()
  });

  return {
    updates,
    interaction,
    geometry,
    presentation,
    renderFlow,
    get renderResult() {
      return currentRenderResult;
    },
    commitRenderResult(renderResult) {
      currentRenderResult = renderResult;
      interaction.refreshHeaderFooterEditingChrome();
      interaction.refreshDrawingContextualCommands();
      interaction.widgetEvents.setTargets(renderResult.viewTargets);
      interaction.refreshCreatedDrawingTextEntry();
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      updates.destroy();
      presentation.destroy();
      interaction.destroy();
    }
  };
}

/**
 * Requires a construction-phase runtime resource without inventing a fallback.
 *
 * @param resource - Resource populated by a later construction phase.
 * @param label - Human-readable capability name used by diagnostics.
 * @returns Initialized resource.
 */
function requireRuntimeResource<Resource>(
  resource: Resource | undefined,
  label: string
): Resource {
  if (resource === undefined) {
    throw new Error(`Mounted paginated runtime used ${label} before initialization`);
  }
  return resource;
}
