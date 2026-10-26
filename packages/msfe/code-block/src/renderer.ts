import type { MsfeNodeViewProps, MsfeNodeViewRenderer } from "@quirekit/msfe-core";
import type { CodeBlockAttributes } from "./types";

/** Native controls use the same source binding as Vue and React components. */
export const codeBlockRenderer: MsfeNodeViewRenderer = ({ dom, props }) => {
  const select = dom.ownerDocument.createElement("select");
  select.className = "msfe-code-language";
  select.setAttribute("aria-label", "代码语言");
  let current = props as MsfeNodeViewProps<CodeBlockAttributes>;
  select.addEventListener("change", () => { current.updateAttributes({ language: select.value }); });
  /** @param next - New source attributes or readonly state. */
  function update(next: MsfeNodeViewProps): void {
    current = next as MsfeNodeViewProps<CodeBlockAttributes>;
    select.replaceChildren(...[...new Set([current.attrs.language, "", "typescript", "javascript", "json", "css", "python", "bash"])].map(value => {
      const option = dom.ownerDocument.createElement("option"); option.value = value; option.textContent = value || "纯文本"; return option;
    }));
    select.value = current.attrs.language; select.disabled = current.readOnly;
  }
  dom.append(select); update(props);
  return { update, destroy() { select.remove(); } };
};
