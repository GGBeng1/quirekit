import type { EditorView } from "@quirekit/cm-view";

/** Ephemeral deletion buffer; never belongs to the source document. */
export const inputSentinel = "\u200b";

/** @param view - Source view owning the native keyboard host. @returns A measurable, pointer-inert input proxy. */
export function createSourceInput(view: EditorView): HTMLTextAreaElement {
  const input = view.dom.ownerDocument.createElement("textarea");
  input.setAttribute("data-msfe-input", ""); input.className = "msfe-input-proxy";
  input.setAttribute("aria-label", view.contentDOM.getAttribute("aria-label") ?? "Markdown 编辑器");
  input.autocomplete = "off"; input.autocapitalize = "off"; input.spellcheck = false;
  input.setAttribute("autocorrect", "off"); input.setAttribute("enterkeyhint", "enter");
  // Structural input styles cannot depend on selectors inside the CM subtree.
  input.style.cssText = "position:fixed;width:1px;height:20px;font-size:16px;line-height:20px;opacity:0;color:transparent;caret-color:transparent;pointer-events:none;padding:0;margin:0;border:0;outline:none;resize:none;overflow:hidden;";
  input.tabIndex = -1; input.disabled = true; input.hidden = true;
  clearSourceInput(input);
  // Keep the native keyboard host outside CM's noneditable display subtree.
  // WebKit can otherwise report focus yet produce no text-input events.
  const root = view.root;
  if (root instanceof view.dom.ownerDocument.defaultView!.ShadowRoot) root.append(input);
  else view.dom.ownerDocument.body.append(input);
  return input;
}

/** @param input - Native host whose value must remain nonpersistent. */
export function clearSourceInput(input: HTMLTextAreaElement): void {
  input.value = inputSentinel;
  // A detached/blurred host has no native selection ownership. Reasserting its
  // control selection on blur can invite WebKit's UIKit caret back over the
  // retained custom overlay. Focus acquisition establishes it explicitly.
  if ((input.getRootNode() as Document | ShadowRoot).activeElement === input) input.setSelectionRange(1, 1);
}

/** @param input - Native host. @returns Browser text without the adapter's deletion buffer. */
export function readSourceInput(input: HTMLTextAreaElement): string {
  return input.value.startsWith(inputSentinel) ? input.value.slice(1) : input.value;
}
