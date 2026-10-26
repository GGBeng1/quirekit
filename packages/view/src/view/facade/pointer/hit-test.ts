import type {
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions
} from "../../types";
import { resolveQuireViewPointerNearestCaretHit } from "./nearest-caret-hit";

/**
 * Hit-tests a pointer position without mutating editor selection.
 *
 * @param options - Pointer coordinates and retained geometry inputs for hit testing.
 * @returns Pointer hit-test result and retained geometry snapshot.
 */
export function hitTestQuireViewPointer(
  options: QuireViewPointerSelectionOptions
): QuireViewPointerHitTestResult {
  return resolveQuireViewPointerNearestCaretHit(
    options,
    options.clientPoint
  );
}
