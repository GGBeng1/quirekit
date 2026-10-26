import { canvasInternalClipboardMime } from "../internal";
import type { SystemClipboardEntries } from "./types";
const webSliceFormat = `web ${canvasInternalClipboardMime}`;

/**
 * Writes captured editor formats to the system clipboard.
 *
 * Chrome and Edge first receive HTML, text and the private slice as a web
 * custom format so a later menu paste reads the exact slice. Other engines use
 * a one-shot `execCommand("copy")` listener with the exact formats, then the
 * plain async API. The HTML itself always embeds the slice as a fallback.
 *
 * @param document - Document owning the focused editor input.
 * @param entries - Formats captured from the editor copy pipeline.
 * @returns Whether the browser accepted the write.
 */
export async function writeSystemClipboard(
  document: Document,
  entries: SystemClipboardEntries
): Promise<boolean> {
  if (await writeAsyncClipboard(document, entries, true)) return true;
  if (writeThroughCopyEvent(document, entries)) return true;
  return writeAsyncClipboard(document, entries, false);
}

/**
 * Answers one synchronous copy command with the captured formats.
 *
 * @param document - Document owning the focused editor input.
 * @param entries - Formats captured from the editor copy pipeline.
 * @returns Whether the copy event carried the formats.
 */
function writeThroughCopyEvent(document: Document, entries: SystemClipboardEntries): boolean {
  let written = false;
  const listener = (event: ClipboardEvent) => {
    if (event.clipboardData === null) return;
    for (const [type, value] of entries) event.clipboardData.setData(type, value);
    event.preventDefault();
    event.stopImmediatePropagation();
    written = true;
  };
  document.addEventListener("copy", listener, true);
  try {
    document.execCommand("copy");
  } catch {
    written = false;
  } finally {
    document.removeEventListener("copy", listener, true);
  }
  return written;
}

/**
 * Writes HTML, text and optionally the web custom slice format through the async API.
 *
 * @param document - Document owning the editor.
 * @param entries - Formats captured from the editor copy pipeline.
 * @param withSlice - Whether to include the web custom slice format; skipped when unsupported.
 * @returns Whether the browser accepted the write.
 */
async function writeAsyncClipboard(
  document: Document,
  entries: SystemClipboardEntries,
  withSlice: boolean
): Promise<boolean> {
  const window = document.defaultView;
  const clipboard = window?.navigator.clipboard;
  const Item = window?.ClipboardItem;
  if (window === null || window === undefined || clipboard?.write === undefined || Item === undefined) return false;
  if (withSlice && Item.supports?.(webSliceFormat) !== true) return false;
  const items: Record<string, Blob> = {};
  for (const [type, value] of entries) {
    if (type === "text/html" || type === "text/plain") items[type] = new window.Blob([value], { type });
    if (withSlice && type === canvasInternalClipboardMime) items[webSliceFormat] = new window.Blob([value], { type: webSliceFormat });
  }
  if (Object.keys(items).length === 0) return false;
  try {
    await clipboard.write([new Item(items)]);
    return true;
  } catch {
    return false;
  }
}
