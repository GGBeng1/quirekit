import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { readHtmlSandboxDocument } from "@quirekit/html-sandbox";
import type { HtmlSandboxOptions, HtmlSandboxViewHandle } from "./types";
/** Mount an interactive retained HTML atom; Canvas layout is not implied.
 * @param props - Editor-owned node view. @param options - Trusted mount factory. @returns Retained view lifecycle.
 */
export function htmlSandboxNodeView(props: QuireNodeViewRendererProps, options: HtmlSandboxOptions) {
  const dom = props.view.dom.ownerDocument.createElement("figure");
  dom.contentEditable = "false";
  dom.dataset.qkHtmlSandbox = "true";
  dom.style.cssText = "margin:16px 0;width:100%;min-width:0";
  let shell: HtmlSandboxViewHandle | undefined;
  /** @param node - Current immutable source owner. @returns Whether the node is compatible. */
  function update(node: Node): boolean {
    if (node.type.name !== "htmlSandbox") return false;
    try {
      const document = readHtmlSandboxDocument(node.attrs.document);
      if (shell) shell.update(document);
      else if (options.mount) shell = options.mount(dom, document);
      else { const source = dom.ownerDocument.createElement("pre"); source.textContent = document.html; dom.replaceChildren(source); }
    } catch { shell?.destroy(); shell = undefined; dom.textContent = "Invalid HTML sandbox source"; }
    return true;
  }
  /** Only the non-control surface delegates selection to the editor.
   * @param event - Pointer intent outside component controls.
   */
  function select(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || event.shiftKey || target.closest("button,a,input,textarea,[role=tab],iframe")) return;
    const position = props.getPos();
    if (position !== undefined && props.editor.commands.setNodeSelection(position)) { event.preventDefault(); props.view.focus(); }
  }
  dom.addEventListener("pointerdown", select);
  update(props.node);
  return { dom, update,
    /** Project selection without rerunning author code. */ selectNode() { dom.style.outline = "2px solid var(--qk-color-action-primary,#2563eb)"; },
    /** Clear host selection decoration. */ deselectNode() { dom.style.outline = ""; },
    /** @param event - Event inside retained controls. @returns Whether the component owns it. */
    stopEvent(event: Event) { return event.type !== "dragstart" && event.type !== "dragover" && event.type !== "drop"; },
    /** @returns Internal guest and control mutations are not document edits. */ ignoreMutation() { return true; },
    /** Dispose runtime even when removed by undo, collaboration or virtualization. */
    destroy() { dom.removeEventListener("pointerdown", select); shell?.destroy(); dom.remove(); },
  };
}
