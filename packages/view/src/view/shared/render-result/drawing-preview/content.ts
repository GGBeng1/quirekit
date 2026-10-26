import { rebuildMountedDrawingControlPreview } from "./geometry";
import {
  translateQuireDisplayCommand
} from "@quirekit/renderer";
import type { QuireDrawingControllerIdentity } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../../types";
import type {
  CreateMountedDrawingPreviewRenderResultOptions,
  MountedDrawingContentPreviewCommandProjection,
  MountedDrawingStoryContent
} from "./types";
import { findMountedDrawingContribution } from "./ownership";
import { projectMountedDrawingSurfaceCommands } from "./surface";
import {
  createMountedDrawingStoryResizeClip,
  createMountedDrawingStoryResizeClipId
} from "./story-clip";
import {
  clipMountedDrawingPreviewCommandsToPage,
  createMountedDrawingPreviewPageClipId,
  resolveMountedDrawingPreviewPageRect,
  unwrapMountedDrawingAcceptedPageClip
} from "./page-clip";

/**
 * Resolves one exact content-plane projection for a mounted drawing preview.
 *
 * Move previews translate shell and story because local geometry is invariant.
 * Resize previews reshape supported shell commands and translate story commands
 * by the preview-origin delta while keeping accepted glyph metrics and line
 * breaks. The final transaction rebuilds layout. Rotation keeps accepted paint
 * until canonical transformed products exist.
 *
 * @param options - Previous result, controller state, and active/restore mode.
 * @returns Exact content replacement, or undefined when ownership is stale.
 */
export function resolveMountedDrawingContentPreviewCommands(
  options: CreateMountedDrawingPreviewRenderResultOptions
): MountedDrawingContentPreviewCommandProjection | undefined {
  if (options.state.kind === "creating") {
    return undefined;
  }
  const contribution = findMountedDrawingContribution(
    options.previousRenderResult.layoutSnapshot.layerContributions,
    options.state.identity,
    "content"
  );
  if (contribution === undefined) {
    return undefined;
  }
  const story = collectMountedDrawingStoryContent(
    options.previousRenderResult,
    options.state.identity
  );
  const storyCommands = story?.commands ?? [];
  const acceptedCommands = [...contribution.commands, ...storyCommands];
  const acceptedSurfaceCommands = unwrapMountedDrawingAcceptedPageClip(
    contribution.commands
  );

  const shouldTranslate = options.active && options.state.kind === "moving";
  const dx = options.state.track.previewFrame.rect.x
    - options.state.track.startFrame.rect.x;
  const dy = options.state.track.previewFrame.rect.y
    - options.state.track.startFrame.rect.y;
  const resizedSurfaceCommands = options.active && options.state.kind === "resizing"
    ? projectMountedDrawingSurfaceCommands(
        acceptedSurfaceCommands,
        options.state.track.startFrame.rect,
        options.state.track.previewFrame.rect
      )
    : undefined;
  const resizedStoryCommands = options.active
    && options.state.kind === "resizing"
    && story !== undefined
    ? [createMountedDrawingStoryResizeClip(
        story,
        options.state.identity,
        options.state.track.startFrame.rect,
        options.state.track.previewFrame.rect
      )]
    : storyCommands;
  const controlCommands = options.active && options.state.kind === "controlling"
    ? rebuildMountedDrawingControlPreview(options.state, acceptedSurfaceCommands) : undefined;
  const activeCommands = controlCommands !== undefined ? [...controlCommands, ...storyCommands] : shouldTranslate
    ? [...acceptedSurfaceCommands, ...storyCommands].map((command) =>
        translateQuireDisplayCommand(command, dx, dy)
      )
    : resizedSurfaceCommands === undefined
      ? acceptedCommands
      : [...resizedSurfaceCommands, ...resizedStoryCommands];
  // Retained contributions carry portable resource keys. Rebind only this
  // object's projected paint to the mounted decoder before page-local clipping;
  // cached images keep their stable slot and never trigger chart compilation.
  const preparedCommands = options.active && options.prepareDrawingPreviewContent !== undefined
    ? options.prepareDrawingPreviewContent({
        bounds: options.previousRenderResult.layoutSnapshot.documentRect,
        commands: activeCommands
      }).commands
    : activeCommands;
  const replacementCommands = options.active
    ? clipMountedDrawingPreviewCommandsToPage(
        preparedCommands,
        resolveMountedDrawingPreviewPageRect(
          options.previousRenderResult,
          options.state.identity
        ),
        options.state.identity,
        "content"
      )
    : acceptedCommands;
  return {
    replacementCommands,
    replacedCommandIds: new Set([
      ...acceptedCommands.map((command) => command.id),
      createMountedDrawingStoryResizeClipId(options.state.identity),
      createMountedDrawingPreviewPageClipId(options.state.identity, "content")
    ])
  };
}

/**
 * Collects retained story commands paired with one drawing occurrence.
 *
 * Direct display owners preserve the story's independent source and selection
 * authority while exposing its exact accepted paint family. Move previews can
 * therefore translate shell and story together without replaying layout.
 *
 * @param previous - Last committed render result and direct owner chunks.
 * @param identity - Captured drawing occurrence identity.
 * @returns Retained story paint and its accepted inner rectangle, when found.
 */
function collectMountedDrawingStoryContent(
  previous: QuireViewRenderResult,
  identity: QuireDrawingControllerIdentity
): MountedDrawingStoryContent | undefined {
  const storyRootId = `root:word-drawing-text:${identity.objectId}`;
  const occurrence = readDrawingOccurrence(identity.visualInstanceId);
  const chunk = (previous.displayOwnerChunks?.chunks ?? []).find((candidate) => {
    const region = candidate.owner.region;
    return region.kind === "drawing-text"
      && region.rootId.value === storyRootId
      && readDrawingOccurrence(region.visualInstanceId) === occurrence;
  });
  if (chunk === undefined) {
    return undefined;
  }

  return {
    commands: chunk.contentDisplayList.commands,
    rect: chunk.owner.rect
  };
}

/**
 * Normalizes shell and story visual identities to their shared page occurrence.
 *
 * @param visualInstanceId - Shell or story visual-instance identity.
 * @returns Page key, or `continuous` outside pagination.
 */
function readDrawingOccurrence(
  visualInstanceId: string | undefined
): string {
  const pageMatch = visualInstanceId?.match(/(?:^|:)page:(\d+)(?::|$)/u);
  return pageMatch?.[1] === undefined ? "continuous" : `page:${pageMatch[1]}`;
}
