import type { Editor } from "@quirekit/core";
import type { QuireKitImagePreviewItem } from "@quirekit/ui/vue";
import { readMediaPresentation } from "../../../media/presentation";
import type { BlockMediaGallery } from "./types";
import type { BlockResource } from "../../../rich-content/types";

/**
 * Captures every resolved media preview in source order only when viewing is requested.
 * Retained DOM supplies the feature-owned resource; no drawing engine or geometry is queried.
 * @param editor - Canonical document and its retained HTML projection.
 * @param position - Opening block's canonical position.
 * @param imageIndex - Opening image inside a gallery.
 * @returns A viewing snapshot, or null if the opening block has no image preview.
 */
export function collectBlockMediaGallery(editor: Editor, position: number, imageIndex = 0): BlockMediaGallery | null {
  const items: QuireKitImagePreviewItem[] = [];
  let index = -1, origin: HTMLElement | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "imageGallery") {
      const root = editor.view.nodeDOM?.(pos) as HTMLElement | null;
      if (pos === position && root) { index = items.length + imageIndex; origin = root; }
      for (const item of node.attrs.items as BlockResource[]) items.push({ id: `gallery:${pos}:${item.id}`, src: item.src, title: item.name, alt: item.alt || item.name, description: node.attrs.caption || "" });
      return false;
    }
    if (!("media" in node.attrs)) return;
    const dom = editor.view.nodeDOM?.(pos);
    if (dom?.nodeType !== 1) return false;
    const root = dom as HTMLElement, image = root.querySelector("img");
    if (!image?.getAttribute("src")?.trim()) return false;
    const media = readMediaPresentation(node.attrs.media);
    const graphic = node.type.name !== "image";
    const title = graphic ? image.alt : String(node.attrs.title ?? "");
    if (pos === position) { index = items.length; origin = root; }
    // Repeated URLs remain separate blocks. Position identifies this immutable
    // session; closing and reopening collects the current document afresh.
    items.push({ id: `media:${pos}`, src: image.currentSrc || image.src, alt: media.alt || image.alt,
      ...(title ? { title } : {}), ...(media.caption ? { description: media.caption } : {}),
      ...(graphic ? { background: "#fff" } : {}) });
    return false;
  });
  return index < 0 || !origin ? null : { items, index, origin };
}
