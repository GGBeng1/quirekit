import { Node, mergeAttributes } from "@quirekit/core";
import { validMediaSource } from "./presentation";
/** Source-preserving raster image block using the same media adaptation as diagrams. */
export const BlockImage = Node.create({
 name: "image", group: "block", atom: true, selectable: true, draggable: true,
 /** @returns Persistent image source and accessible description. */
 addAttributes() { return { src: { default: "" }, alt: { default: "" }, title: { default: "" } }; },
 /** @returns Ordinary image HTML admission with safe persistent sources. */
 parseHTML() { return [{ tag: "img[src]", /** @param element - Imported image. @returns Safe source attributes or refusal. */ getAttrs(element) { return validMediaSource(element.getAttribute("src")) ? null : false; } }]; },
 /** @param context - Canonical image. @returns Standard clipboard/export image. */
 renderHTML({ HTMLAttributes }) { return ["img", mergeAttributes(HTMLAttributes, { style: "display:block;max-width:100%;height:auto" })]; },
 /** @returns Inert image preview; shared adapter owns geometry and selection. */
 addNodeView() { return props => {
  const dom = props.view.dom.ownerDocument.createElement("img");
  /** @param node - Updated canonical source. @returns Whether the source is still an image. */
  const update = (node: typeof props.node): boolean => { if (node.type.name !== "image") return false; dom.src = validMediaSource(node.attrs.src) ? node.attrs.src : ""; dom.alt = String(node.attrs.alt ?? ""); return true; };
  update(props.node); return { dom, update };
 }; }
});
