import type { MsfeNodeViewProps, MsfeNodeViewRenderer } from "@quirekit/msfe-core";
import type { ImageSource, MsfeImageResource } from "./types";

/** Native fallback shares the exact same source binding and resource lifetime as framework views. */
export const imageRenderer: MsfeNodeViewRenderer = ({ dom, props }) => {
  const button = dom.ownerDocument.createElement("button");
  button.type = "button";
  button.className = "msfe-image";
  let current = props as MsfeNodeViewProps<ImageSource, MsfeImageResource>;
  button.addEventListener("click", () => current.revealSource());
  /** @param next - Latest source fields and acquired resource. */
  function update(next: MsfeNodeViewProps): void {
    current = next as MsfeNodeViewProps<ImageSource, MsfeImageResource>;
    button.disabled = current.readOnly;
    button.setAttribute("aria-label", `编辑图片：${current.attrs.alt || "无替代文本"}`);
    if (current.resource) {
      let image = button.querySelector("img");
      if (!image) {
        image = dom.ownerDocument.createElement("img");
        image.addEventListener("error", () => { button.textContent = `图片加载失败：${current.attrs.alt}`; });
        button.replaceChildren(image);
      }
      image.alt = current.attrs.alt; image.title = current.attrs.title ?? "";
      if (image.getAttribute("src") !== current.resource.url) image.src = current.resource.url;
    } else button.textContent = current.status === "error" ? `图片加载失败：${current.attrs.alt}` : `加载图片：${current.attrs.alt}`;
  }
  dom.append(button); update(props);
  return { update, destroy() { button.remove(); } };
};
