import { Decoration, type Node } from "@quirekit/pm";

/** @param node - Canonical source. @param position - Code block boundary. @returns Logical line markers that never enter source or clipboard text. */
export function codeLineNumbers(node: Node, position: number): Decoration[] {
  if (!node.attrs.lineNumbers) return [];
  const source = node.textContent, starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  return starts.map((offset, index) => Decoration.widget(position + 1 + offset, view => {
    const marker = view.dom.ownerDocument.createElement("span");
    marker.className = "qk-block-code__line-number"; marker.dataset.line = String(index + 1);
    marker.contentEditable = "false"; marker.setAttribute("aria-hidden", "true");
    return marker;
  }, { key: `code-line:${index + 1}`, side: -1, ignoreSelection: true }));
}
