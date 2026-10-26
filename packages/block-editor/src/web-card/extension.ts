import { Node, selectionPreset } from "@quirekit/core";
import { webURL } from "../rich-content/urls";
import { renderRichContent } from "../rich-content/surface";
import { readWebMetadata, webImageURL } from "./metadata";
import { webLinkCommands } from "./commands";
/** Portable link metadata and the block presentations of an ordinary web link. */
export const BlockWebCard = Node.create({
  name: "webCard", group: "block", atom: true, selectable: true, draggable: true,
  /** @returns Whole-block selection. */ addSelection() { return [selectionPreset.atomicBlock({ id: this.name, nodeTypes:[this.name] })]; },
  /** @returns User-authored metadata; network and execution state are not serialized. */
  addAttributes() { return {
    url: { default:"", rendered:false, /** @param value - Persisted URL. */ validate(value: unknown) { if (!webURL(value)) throw new RangeError("Invalid web URL"); } },
    title:{default:"",rendered:false,validate:"string"}, description:{default:"",rendered:false,validate:"string"},
    icon:{default:"",rendered:false,validate:"string"}, cover:{default:"",rendered:false,validate:"string"},
    mode:{default:"card",rendered:false, /** @param value - Presentation. */ validate(value: unknown) { if (!["card","embed"].includes(String(value))) throw new RangeError("Invalid web mode"); } },
    height:{default:360,rendered:false, /** @param value - Authored height in CSS pixels. */ validate(value: unknown) { if (!Number.isFinite(value) || Number(value)<160 || Number(value)>800) throw new RangeError("Invalid embed height"); } }
  }; },
  /** @returns Block-local metadata on ordinary links, retained through HTML clipboard and save. */
  addGlobalAttributes() { return [{ types: ["link"], attributes: { web: {
    default: null,
    /** @param element - Imported anchor. @returns Valid optional metadata. */
    parseHTML(element: HTMLElement) { try { return readWebMetadata(JSON.parse(element.getAttribute("data-qk-link-web") ?? "null")); } catch { return null; } },
    /** @param attrs - Canonical link. @returns Portable nonvisual metadata. */
    renderHTML(attrs: Record<string, unknown>) { const metadata = readWebMetadata(attrs.web); return metadata ? { "data-qk-link-web": JSON.stringify(metadata) } : {}; }
  } } }]; },
  /** @returns Atomic presentation and resize commands. */ addCommands() { return webLinkCommands(); },
  /** @returns Explicit portable link-card markup. */
  parseHTML() { return [{tag:"aside[data-qk-web-card]",getAttrs: element => {
    try { const attrs = JSON.parse(element.getAttribute("data-qk-web-card") ?? "{}"); return webURL(attrs.url) ? attrs : false; } catch { return false; }
  }}]; },
  /** @param context - Committed metadata. @returns Readable external link; exports never auto-load remote execution. */
  renderHTML({node}) { return ["aside",{"data-qk-web-card":JSON.stringify(node.attrs)},...(webImageURL(node.attrs.cover)?[["img",{src:node.attrs.cover,alt:""}]]:[]),["a",{href:node.attrs.url,target:"_blank",rel:"noopener noreferrer"},node.attrs.title || node.attrs.url],["p",{},node.attrs.description]]; },
  /** @returns Product content surface. */ addNodeView() { return renderRichContent; },
});
