import { Node, selectionPreset } from "@quirekit/core";
import type { DOMOutputSpec } from "@quirekit/pm";
import type { BlockResource } from "../rich-content/types";
import { renderRichContent } from "../rich-content/surface";
import { validResources } from "../resources/model";
import { attachmentCommands } from "./commands";

/** An attachment can participate in ordinary paragraph editing without losing its file identity. */
export const BlockInlineAttachment = Node.create({
  name: "inlineAttachment", inline: true, group: "inline", atom: true, selectable: true, draggable: true,
  /** @returns The same persistent resources as the block presentation. */
  addAttributes: () => ({
    items: { default: [], rendered: false, /** @param value - Stored collection. */ validate(value: unknown) { if (!validResources(value)) throw new RangeError("Invalid attachment"); } },
    kind: { default: "attachment", rendered: false, /** @param value - Attachment identity. */ validate(value: unknown) { if (value !== "attachment") throw new RangeError("Invalid attachment kind"); } },
    caption: { default: "", rendered: false, validate: "string" }
  }),
  /** @returns Inline ownership preserving text selection around the atom. */
  addSelection: () => [selectionPreset.inline({ id: "inlineAttachment", nodeTypes: ["inlineAttachment"] })],
  /** @returns Same-resource presentation commands. */
  addCommands: attachmentCommands,
  /** @returns Portable inline import. */
  parseHTML: () => [{ tag: "span[data-qk-attachment]", getAttrs: element => {
    try { const attrs = JSON.parse(element.getAttribute("data-qk-attachment")!); return validResources(attrs.items) ? attrs : false; } catch { return false; }
  } }],
  /** @param context - Canonical files. @returns Static download links with complete restore data. */
  renderHTML: ({ node }): DOMOutputSpec => ["span", { "data-qk-attachment": JSON.stringify(node.attrs) },
    ...(node.attrs.items as BlockResource[]).map(item => ["a", { href: item.src, download: item.name }, item.name] as DOMOutputSpec)],
  /** @param context - Canonical files. @returns Readable clipboard text. */
  renderText: ({ node }) => (node.attrs.items as BlockResource[]).map(item => item.name).join("、"),
  /** @returns Provider-preserving shared mount. */
  addNodeView: () => renderRichContent
});
