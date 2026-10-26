import type {
  QuireCompositionInputEvent,
  QuireEditorInputResult
} from "../../types";
import type { QuireEditorInputControllerRuntime } from "../runtime";
import { handleQuireControllerTextInput } from "./text";

/**
 * Starts a browser IME composition session.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Optional composition event carrying initial text.
 * @returns Composition state update result.
 */
export function handleQuireControllerCompositionStart(
  runtime: QuireEditorInputControllerRuntime,
  event?: QuireCompositionInputEvent
): QuireEditorInputResult {
  runtime.composition.start(event?.data ?? "");
  runtime.dispatchCompositionDomEvent("compositionstart", event);

  return { handled: true, docChanged: false };
}

/**
 * Updates in-progress IME composition text without mutating the document.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Composition update event.
 * @returns Composition state update result.
 */
export function handleQuireControllerCompositionUpdate(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireCompositionInputEvent
): QuireEditorInputResult {
  runtime.composition.update(event.data ?? "");
  runtime.dispatchCompositionDomEvent("compositionupdate", event);

  return { handled: true, docChanged: false };
}

/**
 * Commits finalized IME composition text once the browser session ends.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Composition end event.
 * @returns Input result for the finalized text commit.
 */
export function handleQuireControllerCompositionEnd(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireCompositionInputEvent
): QuireEditorInputResult {
  const { text, compositionId } = runtime.composition.end(event.data ?? "");
  const result = handleQuireControllerTextInput(runtime, text, compositionId);

  runtime.dispatchCompositionDomEvent("compositionend", event);

  return result;
}
