import {
  compileQuireViewNode,
  type QuireDisplayCommand,
  type QuireRect
} from "@quirekit/renderer";
import {
  applyQuireObjectSelectionSurfaceConfig,
  createQuireDrawingSelectedObjectView,
  transformQuireDrawingSelectionProducts,
  type QuireRetainedLayerContribution
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import type {
  CreateMountedDrawingPreviewRenderResultOptions,
  MountedDrawingPreviewCommandProjection
} from "./types";
import { findMountedDrawingContribution } from "./ownership";
import {
  clipMountedDrawingPreviewCommandsToPage,
  resolveMountedDrawingPreviewPageRect
} from "./page-clip";

const drawingPreviewCommandPrefix = "mounted-drawing-preview:";

/**
 * Resolves accepted ownership and compiles one exact transient command family.
 *
 * @param options - Previous result, controller state, and active/restore mode.
 * @returns Exact replacement projection, or undefined when ownership is stale.
 */
export function resolveMountedDrawingPreviewCommands(
  options: CreateMountedDrawingPreviewRenderResultOptions
): MountedDrawingPreviewCommandProjection | undefined {
  if (options.state.kind === "creating") {
    return undefined;
  }
  const contribution = findMountedDrawingContribution(
    options.previousRenderResult.layoutSnapshot.layerContributions,
    options.state.identity,
    "overlay",
    "selected-owner"
  );
  if (contribution === undefined) {
    return undefined;
  }

  // Compile visual chrome only. Interaction targets remain accepted retained
  // products, so pointer capture survives every transient repaint.
  const previewCommands = compilePreviewCommands(
    options.state,
    contribution,
    resolveMountedDrawingPreviewPageRect(
      options.previousRenderResult,
      options.state.identity
    ),
    options.surfaceConfig
  );
  return {
    replacementCommands: options.active
      ? previewCommands
      : applyQuireObjectSelectionSurfaceConfig(
          contribution.commands,
          options.surfaceConfig?.objectSelection
        ),
    replacedCommandIds: collectDrawingPreviewReplacementIds(
      options.previousRenderResult,
      contribution,
      previewCommands
    )
  };
}

/**
 * Compiles the selection product at the latest transient frame.
 *
 * @param state - Active manipulation state carrying preview geometry.
 * @param contribution - Accepted contribution supplying source range.
 * @param pageRect - Immutable owning page clip, when paginated.
 * @param surfaceConfig - Optional semantic surface styling.
 * @returns Renderer-neutral preview commands; compiled targets are discarded.
 */
function compilePreviewCommands(
  state: CreateMountedDrawingPreviewRenderResultOptions["state"],
  contribution: QuireRetainedLayerContribution,
  pageRect: QuireRect | undefined,
  surfaceConfig: CreateMountedDrawingPreviewRenderResultOptions["surfaceConfig"]
): readonly QuireDisplayCommand[] {
  if (state.kind === "creating") {
    return [];
  }
  const frame = state.track.previewFrame;
  const compiled = compileQuireViewNode({
    id: `${drawingPreviewCommandPrefix}${state.identity.objectId}:${state.identity.drawingId}`,
    node: createQuireDrawingSelectedObjectView(
      frame.rect.width,
      frame.rect.height,
      {
        objectId: state.identity.objectId,
        drawingId: state.identity.drawingId,
        lockAspectRatio: state.lockAspectRatio,
        drawing: state.track.previewDrawing ?? (state.drawing === undefined ? undefined : {
          ...state.drawing, extent: { width: frame.rect.width, height: frame.rect.height }
        })
      }
    ),
    origin: { x: frame.rect.x, y: frame.rect.y },
    constraints: {
      minWidth: frame.rect.width,
      maxWidth: frame.rect.width,
      minHeight: frame.rect.height,
      maxHeight: frame.rect.height
    },
    range: contribution.range,
    layer: "overlay"
  });
  const commands = transformQuireDrawingSelectionProducts({
    commands: compiled.displayList.commands,
    targets: compiled.targets,
    frame
  }).commands;
  return applyQuireObjectSelectionSurfaceConfig(
    clipMountedDrawingPreviewCommandsToPage(
      commands,
      pageRect,
      state.identity,
      "overlay"
    ),
    surfaceConfig?.objectSelection
  );
}

/**
 * Collects accepted and previous-preview ids owned by this transient family.
 *
 * @param previous - Current render result.
 * @param contribution - Accepted selection contribution.
 * @param previewCommands - Compiled command family whose previous revision is replaced.
 * @returns Exact ids that may be replaced without touching other overlays.
 */
function collectDrawingPreviewReplacementIds(
  previous: QuireViewRenderResult,
  contribution: QuireRetainedLayerContribution,
  previewCommands: readonly QuireDisplayCommand[]
): ReadonlySet<string> {
  const ids = new Set(contribution.commands.map((command) => command.id));
  for (const command of previewCommands) {
    collectCommandId(command, ids);
  }
  for (const command of previous.overlayDisplayList.commands) {
    collectPrefixedPreviewCommandId(command, ids);
  }
  for (const chunk of previous.pageDisplayListChunks?.chunks ?? []) {
    for (const command of chunk.overlayDisplayList.commands) {
      collectPrefixedPreviewCommandId(command, ids);
    }
  }
  return ids;
}

/**
 * Adds one preview-prefixed command id and nested clip ids to an exact set.
 *
 * @param command - Previous display command to inspect.
 * @param ids - Mutable exact-id set owned by the current projection.
 */
function collectPrefixedPreviewCommandId(
  command: QuireDisplayCommand,
  ids: Set<string>
): void {
  if (command.id.startsWith(drawingPreviewCommandPrefix)) {
    ids.add(command.id);
  }
  if (command.kind === "clip") {
    for (const nested of command.commands) {
      collectPrefixedPreviewCommandId(nested, ids);
    }
  }
}

/**
 * Adds one compiled command family id and nested clip ids to an exact set.
 *
 * @param command - Compiled preview command to inspect.
 * @param ids - Mutable exact-id set owned by the current projection.
 */
function collectCommandId(
  command: QuireDisplayCommand,
  ids: Set<string>
): void {
  ids.add(command.id);
  if (command.kind === "clip") {
    for (const nested of command.commands) {
      collectCommandId(nested, ids);
    }
  }
}
