import type {
  QuireMountedCaretMode,
  QuireMountedCaretRenderingMode
} from "../types";
import type { MountedCaretPresentation } from "./types";

/**
 * Reports whether a caret rendering mode keeps the caret out of the overlay.
 *
 * The DOM caret rendering mode (the default) paints the caret as a DOM element, so
 * the overlay display list must omit caret commands to avoid a double caret. The
 * overlay fallback keeps the caret in the display list.
 *
 * @param mode - Caret rendering mode, or undefined for the default.
 * @returns Whether caret commands should be omitted from the overlay.
 */
export function resolveMountedCaretOmitsOverlayCaret(
  mode: QuireMountedCaretRenderingMode | undefined
): boolean {
  return (mode ?? "dom") === "dom";
}

/**
 * Resolves caret presentation from caret mode, focus, and editability.
 *
 * In `blink` mode the caret shows while editable and blinks only while also
 * focused; `steady` always shows without blinking; `hidden` never shows. This is
 * the single decision shared by the overlay-painted caret and the DOM caret.
 *
 * @param mode - Caret presentation mode for the mounted view.
 * @param focused - Whether the mounted view owns keyboard focus.
 * @param editable - Whether the mounted view currently accepts editing input.
 * @returns Whether the caret should be visible and whether it should blink.
 */
export function resolveMountedCaretPresentation(
  mode: QuireMountedCaretMode,
  focused: boolean,
  editable: boolean
): MountedCaretPresentation {
  if (mode === "hidden") {
    return { visible: false, blinking: false };
  }

  if (mode === "steady") {
    return { visible: true, blinking: false };
  }

  return { visible: editable, blinking: editable && focused };
}
