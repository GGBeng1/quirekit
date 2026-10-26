import { createMountedDrawingCreationRuntime } from "./creation";
import { createMountedDrawingManipulationRuntime } from "./manipulation";
import {
  enterMountedDrawingTextStory,
  enterMountedSelectedDrawingTextStory,
  resolveMountedDrawingTextStoryAt
} from "./text-entry";
import type {
  CreateMountedDrawingInteractionRuntimeOptions,
  MountedDrawingInteractionRuntime
} from "./types";

/**
 * Composes manipulation, creation, and text-entry drawing subdomains.
 *
 * @param options - Editor, editability, and current retained snapshot authority.
 * @returns Unified mounted drawing event and lifecycle facade.
 */
export function createMountedDrawingInteractionRuntime(
  options: CreateMountedDrawingInteractionRuntimeOptions
): MountedDrawingInteractionRuntime {
  const manipulation = createMountedDrawingManipulationRuntime(options);
  const creation = createMountedDrawingCreationRuntime(options);

  return {
    handle: manipulation.handle,
    enterText: (event) => enterMountedDrawingTextStory(options, event),
    enterSelectedText: () => enterMountedSelectedDrawingTextStory(options),
    resolveTextStoryAt: (position) => resolveMountedDrawingTextStoryAt(options, position),
    getState: () => creation.isActive() ? creation.getState() : manipulation.getState(),
    armCreation(creationOptions = {}): boolean {
      manipulation.reset();
      return creation.arm(creationOptions);
    },
    handleCreationPointer: (event) => creation.handlePointer(event),
    updateCreationModifiers: (shiftKey) => creation.updateModifiers(shiftKey),
    cancelCreation: () => creation.cancel(),
    cancelManipulation: () => manipulation.cancel(),
    updateManipulationModifiers: (shiftKey) => manipulation.updateModifiers(shiftKey),
    isCreationActive: () => creation.isActive(),
    destroy(): void {
      creation.destroy();
      manipulation.destroy();
    }
  };
}
