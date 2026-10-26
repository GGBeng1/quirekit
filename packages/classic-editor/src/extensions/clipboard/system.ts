import { canvasInternalClipboardMime } from "@quirekit/clipboard";
import type { ClassicEditorClipboardContent } from "./types";

/** Chrome/Edge web custom format carrying the private slice for async reads. */
const webSliceFormat = `web ${canvasInternalClipboardMime}`;

/** Async Clipboard API surface including the optional unsanitized read. */
type ClassicEditorAsyncClipboard = Clipboard & {
  read(options?: { readonly unsanitized?: readonly string[] }): Promise<ClipboardItems>;
};

export { writeSystemClipboard as writeClassicEditorSystemClipboard } from "@quirekit/clipboard";

/**
 * Reads the system clipboard from a menu gesture.
 *
 * @param window - Window owning the Clipboard API.
 * @param textOnly - Whether only plain text is needed.
 * @returns Clipboard content, or null when the browser refused or lacks the API.
 */
export async function readClassicEditorSystemClipboard(
  window: Window,
  textOnly: boolean
): Promise<ClassicEditorClipboardContent | null> {
  const clipboard = window.navigator.clipboard as ClassicEditorAsyncClipboard | undefined;
  if (clipboard === undefined) return null;
  if (!textOnly && typeof clipboard.read === "function") {
    try {
      let html: string | null = null;
      let text = "";
      let internal: string | null = null;
      for (const item of await readItems(clipboard)) {
        if (internal === null && item.types.includes(webSliceFormat)) internal = await (await item.getType(webSliceFormat)).text();
        if (html === null && item.types.includes("text/html")) html = await (await item.getType("text/html")).text();
        if (text === "" && item.types.includes("text/plain")) text = await (await item.getType("text/plain")).text();
      }
      return { html, text, internal };
    } catch {
      return null;
    }
  }
  if (typeof clipboard.readText !== "function") return null;
  try {
    return { html: null, text: await clipboard.readText(), internal: null };
  } catch {
    return null;
  }
}

/**
 * Reads clipboard items, asking Chrome for unsanitized HTML so the embedded slice survives.
 *
 * @param clipboard - Async clipboard.
 * @returns Clipboard items.
 */
async function readItems(clipboard: ClassicEditorAsyncClipboard): Promise<ClipboardItems> {
  try {
    return await clipboard.read({ unsanitized: ["text/html"] });
  } catch (error) {
    // Only an unsupported option is retried; a refused permission must not prompt twice.
    if (error instanceof Error && error.name === "NotAllowedError") throw error;
    return clipboard.read();
  }
}
