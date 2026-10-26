import { createQuireEditorInputController } from "../controller";
import type { QuireEditorInputBindingOptions } from "../types";
import {
  type QuireActiveSelectionContext,
  type QuireSelectionGeometryContext,
  resolveQuireLineSelectionRange,
  resolveQuireVerticalCaretPosition
} from "@quirekit/view-engine";

/**
 * Creates the interaction-geometry-aware input controller used by a mounted input binding.
 *
 * @param options - Mounted input binding options with editor and interaction geometry access.
 * @returns Input controller configured with vertical and line-boundary resolvers.
 */
export function createMountedInputController(
  options: QuireEditorInputBindingOptions
): ReturnType<typeof createQuireEditorInputController> {
  return createQuireEditorInputController({
    editor: options.editor,
    getInteractionSnapshot: options.getInteractionSnapshot,
    getSelectionContext: options.getSelectionContext,
    getInteractionTarget: options.getInteractionTarget,
    clipboardOutputStrategy: options.clipboardOutputStrategy,
    resolveVerticalCaretPosition: options.navigation?.resolveVerticalCaretPosition ?? ((direction, context) => {
      const snapshot = options.getInteractionSnapshot?.();
      const selectionContext = createInputSelectionGeometryContext(
        options.getSelectionContext?.()
      );

      if (!snapshot) {
        return null;
      }

      return resolveQuireVerticalCaretPosition({
        snapshot,
        position: context.position,
        direction,
        ...(selectionContext === undefined ? {} : { selectionContext })
      });
    }),
    resolveLineBoundaryPosition: options.navigation?.resolveLineBoundaryPosition ?? ((direction, context) => {
      const snapshot = options.getInteractionSnapshot?.();
      const selectionContext = createInputSelectionGeometryContext(
        options.getSelectionContext?.()
      );

      if (!snapshot) {
        return null;
      }

      const range = resolveQuireLineSelectionRange({
        snapshot,
        position: context.position,
        ...(selectionContext === undefined ? {} : { selectionContext })
      });

      if (!range) {
        return null;
      }

      return direction === "start"
        ? { pos: range.from, bias: -1 }
        : { pos: range.to, bias: 1 };
    })
  });
}

/**
 * Converts active command-selection context into retained geometry context.
 *
 * @param activeContext - Active selection context from the mounted runtime.
 * @returns Retained geometry context used by keyboard visual navigation.
 */
function createInputSelectionGeometryContext(
  activeContext: QuireActiveSelectionContext | null | undefined
): QuireSelectionGeometryContext | undefined {
  if (activeContext === null || activeContext === undefined) {
    return undefined;
  }

  return {
    ...(activeContext.activeRegion === undefined
      ? {}
      : { viewRegion: activeContext.activeRegion }),
    ...(activeContext.activeQueryOwner === undefined
      ? {}
      : { queryOwner: activeContext.activeQueryOwner }),
    ...(activeContext.activeReferenceRect === undefined
      ? {}
      : { referenceRect: activeContext.activeReferenceRect })
  };
}
