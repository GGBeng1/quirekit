import { useOverlayBoundaryPosition as useSharedOverlayPosition } from "@quirekit/editor-ui/vue";
import { resolveOverlayViewport } from "./viewport";
import type { ClassicEditorOverlayPositionSources } from "./types";

/** @param sources - Classic ownership and retained document anchor. @returns Shared document positioning. */
export function useOverlayBoundaryPosition(sources: ClassicEditorOverlayPositionSources) {
  return useSharedOverlayPosition({ ...sources,
    viewport: () => resolveOverlayViewport(sources.root()),
    surface: () => sources.host()?.querySelector<HTMLElement>(`[data-qk-classic-overlay="${sources.ownerId}"]`) ?? null
  });
}
