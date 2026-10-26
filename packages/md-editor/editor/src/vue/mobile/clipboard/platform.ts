/**
 * Copies from an explicit user action, including nonsecure LAN previews without Clipboard API.
 * @param doc - Current editor's owner document, including iframe mounts.
 * @param source - Already captured canonical source range.
 * @returns Clipboard acceptance, or a recoverable platform rejection.
 */
export async function writeMobileClipboard(doc: Document, source: string): Promise<void> {
  const win = doc.defaultView, clipboard = win?.navigator.clipboard;
  if (clipboard?.writeText) { await clipboard.writeText(source); return; }
  if (!win || typeof doc.execCommand !== "function") throw new Error("clipboard-unavailable");
  const previous = doc.activeElement, input = doc.createElement("textarea");
  input.value = source; input.tabIndex = -1; input.setAttribute("aria-hidden", "true");
  input.style.cssText = `position:fixed;left:0;top:${win.visualViewport?.offsetTop ?? 0}px;width:1px;height:20px;font-size:16px;opacity:0;pointer-events:none;`;
  doc.body.append(input);
  try {
    // Legacy copy is synchronous to retain this button's user activation. The
    // temporary control owns only clipboard text, never the source/native Range.
    input.focus({ preventScroll: true }); input.select();
    if (!doc.execCommand("copy")) throw new Error("clipboard-rejected");
  } finally {
    input.remove(); if (previous instanceof win.HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
  }
}
/**
 * Reads only in the synchronous call chain of an explicit paste action.
 * @param doc - Current editor's realm; no global or cached clipboard fallback.
 * @returns Plain text, or a rejection that the product can route to its paste field.
 */
export async function readMobileClipboard(doc: Document): Promise<string> {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (!clipboard?.readText) throw new Error("clipboard-unavailable");
  return clipboard.readText();
}
