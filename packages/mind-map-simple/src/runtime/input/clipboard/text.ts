/**
 * Inserts literal clipboard text with exact line breaks into the owned plain-text overlay.
 * @param mount - Instance boundary used to validate selection ownership.
 * @param event - Clipboard event from the overlay.
 */
export function pasteMindMapText(mount: HTMLElement, event: ClipboardEvent): void {
  const editable = (event.target as Element).closest<HTMLElement>('[contenteditable="true"]');
  if (!editable || !mount.contains(editable) || !event.clipboardData) return;
  event.preventDefault(); event.stopPropagation();
  if (!event.clipboardData.types.includes("text/plain")) return;
  const text = event.clipboardData.getData("text/plain").replace(/\r\n?/gu, "\n");
  const owner = mount.ownerDocument;
  const selection = owner.getSelection();
  if (!selection?.rangeCount || !editable.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
  const fragment = owner.createElement("div");
  // The fallback is built solely from text nodes so clipboard markup stays literal.
  // Its separators express source LF independently from browser caret placeholders.
  text.split("\n").forEach((line, index) => {
    if (index) fragment.append(owner.createElement("br"));
    fragment.append(owner.createTextNode(line));
  });
  // A terminal source LF needs a separate caret placeholder in the Range fallback.
  if (text.endsWith("\n")) fragment.append(owner.createElement("br"));
  // Native plain insertion retains undo and browser line containers. Avoid
  // insertHTML's differing terminal BR normalization; the reader handles lines.
  if (!owner.execCommand("insertText", false, text)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const content = owner.createDocumentFragment(); content.append(...fragment.childNodes);
    const last = content.lastChild; range.insertNode(content);
    if (last) {
      if (text.endsWith("\n")) range.setStartBefore(last);
      else range.setStartAfter(last);
    }
    range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: text }));
  }
}
