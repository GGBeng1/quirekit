import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import type { DocumentPropertiesProps } from "./types";

/** Framework-independent safe text presentation; consumers may supply richer controls. */
export const nativeProperties: ComponentViewRenderer<DocumentPropertiesProps> = ({ dom, props, requestMeasure }) => {
  const doc = dom.ownerDocument, panel = doc.createElement("section"), list = doc.createElement("dl");
  const toggle = doc.createElement("button"), source = doc.createElement("button");
  let current = props;
  panel.className = "msfe-document-properties";
  toggle.type = "button"; source.type = "button";
  toggle.addEventListener("click", () => { current.setCollapsed(!current.collapsed); });
  source.addEventListener("click", () => { current.editSource(); });
  panel.append(toggle, list, source); dom.replaceChildren(panel);
  /** @param value - Accepted source snapshot. */
  function render(value: DocumentPropertiesProps): void {
    current = value;
    const title = value.locale === "en" ? "Document properties" : "文档属性";
    panel.setAttribute("aria-label", title);
    toggle.textContent = `${title} ${value.data.entries.length}`;
    toggle.setAttribute("aria-expanded", String(!value.collapsed));
    list.hidden = source.hidden = value.collapsed;
    list.replaceChildren();
    for (const entry of value.data.entries) {
      const key = doc.createElement("dt"), field = doc.createElement("dd");
      key.textContent = entry.key;
      field.textContent = entry.value === undefined ? entry.source : typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
      list.append(key, field);
    }
    source.textContent = value.locale === "en" ? "View source" : "查看源码";
    requestMeasure();
  }
  render(props);
  return { update: render, destroy: () => dom.replaceChildren() };
};
