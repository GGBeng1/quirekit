import type { SystemClipboardEntries } from "./types";

/**
 * Creates a bubbling clipboard event that carries its own DataTransfer.
 *
 * Some engines ignore `clipboardData` in the ClipboardEvent constructor, so the
 * transfer is attached explicitly when the constructed event lacks it.
 *
 * @param window - Window owning the event constructors.
 * @param type - Clipboard event type.
 * @param data - Transfer the editor pipeline reads from or writes into.
 * @returns Cancelable clipboard event.
 */
export function createEditorClipboardEvent(
  window: Window & typeof globalThis,
  type: "copy" | "cut" | "paste",
  data: DataTransfer
): ClipboardEvent {
  const init = { bubbles: true, cancelable: true, clipboardData: data };
  let event: Event;
  try {
    event = new window.ClipboardEvent(type, init);
  } catch {
    event = new window.Event(type, init);
  }
  if ((event as ClipboardEvent).clipboardData !== data) {
    Object.defineProperty(event, "clipboardData", { value: data });
  }
  return event as ClipboardEvent;
}

/**
 * Reads every MIME entry written into one transfer.
 *
 * @param data - Transfer filled by the editor copy pipeline.
 * @returns Non-empty entries in the transfer's type order.
 */
export function readEditorClipboardEntries(data: DataTransfer): SystemClipboardEntries {
  return Array.from(data.types)
    .filter(type => type !== "Files")
    .map(type => [type, data.getData(type)] as const)
    .filter(([, value]) => value.length > 0);
}
