import { Node, selectionPreset } from "@quirekit/core";
import type { DOMOutputSpec } from "@quirekit/pm";
import type { BlockResource } from "../rich-content/types";
import { renderRichContent } from "../rich-content/surface";
import { validResources } from "./model";
/** @param gallery - Image collection or file/media object. @returns Portable atomic content. */
function resourceNode(gallery: boolean) {
  return Node.create({
    name: gallery ? "imageGallery" : "blockAsset", group: "block", atom: true, selectable: true, draggable: true,
    /** @returns Canonical whole-object selection. */ addSelection() { return [selectionPreset.atomicBlock({ id: this.name, nodeTypes: [this.name] })]; },
    /** @returns Data-only resources and presentation. */
    addAttributes() { return {
      items: { default: [], rendered: false, /** @param value - Saved resources. */ validate(value: unknown) { if (!validResources(value, gallery ? "image/" : undefined)) throw new RangeError("Invalid resources"); } },
      kind: { default: gallery ? "imageGallery" : "attachment", rendered: false, validate: gallery ? "string" : (value: unknown) => { if (!["attachment","audio","video"].includes(String(value))) throw new RangeError("Invalid media kind"); } },
      caption: { default: "", rendered: false, validate: "string" },
      columns: { default: 3, rendered: false, /** @param value - Gallery density. */ validate(value: unknown) { if (![2,3,4].includes(Number(value))) throw new RangeError("Invalid gallery columns"); } }
    }; },
    /** @returns Own interoperable markup. */
    parseHTML() { return [{ tag: `figure[data-qk-resource="${gallery ? "gallery" : "file"}"]`, getAttrs: element => {
      try { const attrs = JSON.parse(element.getAttribute("data-qk-resource-data") ?? "{}"); return validResources(attrs.items, gallery ? "image/" : undefined) ? attrs : false; } catch { return false; }
    } }]; },
    /** @param context - Committed resources. @returns Static HTML with download fallback and no upload state. */
    renderHTML({ node }): DOMOutputSpec {
      const attrs = node.attrs, items = attrs.items as BlockResource[];
      const content: DOMOutputSpec[] = gallery ? [["div", {style:`display:grid;grid-template-columns:repeat(${attrs.columns},minmax(0,1fr));gap:12px`}, ...items.map(item => ["img", {src:item.src,alt:item.alt || item.name,style:"width:100%;height:auto"}] as DOMOutputSpec)]]
        : items.map(item => attrs.kind === "audio" || attrs.kind === "video" ? [attrs.kind, {src:item.src, controls:"", preload:"none", style:"max-width:100%"}, ["a",{href:item.src,download:item.name},item.name]] as DOMOutputSpec
          : ["a", {href:item.src,download:item.name}, item.name] as DOMOutputSpec);
      return ["figure", {"data-qk-resource":gallery ? "gallery":"file","data-qk-resource-data":JSON.stringify(attrs)}, ...content, ["figcaption", {}, String(attrs.caption)]];
    },
    /** @returns Shared retained surface with public media UI. */ addNodeView() { return renderRichContent; },
  });
}
export const BlockAsset = resourceNode(false);
export const BlockImageGallery = resourceNode(true);
