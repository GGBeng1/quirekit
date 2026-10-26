import { EditorView } from "@quirekit/cm-view";
import { createPictureAgentCommands } from "./ai/commands";
import { Node, sourceCommand, defineSource, isSafeDestination, encodeMarkdownField, type MsfeCommand } from "@quirekit/msfe-core";
import { readImage, patchImage, imageFingerprint } from "./source";
import { imageRenderer } from "./renderer";
import { imageUploads } from "./paste";
import type { ImageOptions, ImageSource, MsfeImageResource } from "./types";

/** Configurable image semantics; replacing addNodeView preserves this source and resource codec. */
export const Image = Node.create<ImageOptions>({ name: "image",
  addOptions() { return {}; },
  // Paste and drop belong to the image feature, so any editor installing it stores images the same way.
  addExtensions() { return this.options.upload === false ? [] : [imageUploads(this.options.upload)]; },
  addCommands() { return { insertImage: (source: ImageSource) => sourceCommand(insertImage(source)), ...createPictureAgentCommands() }; },
  addAttributes() { return { url: { validate: value => typeof value === "string" && isSafeDestination(value, true) },
    alt: { default: "", validate: value => typeof value === "string" }, title: { default: "", validate: value => typeof value === "string" } }; },
  addSource() { const options = this.options; return defineSource<ImageSource, MsfeImageResource>({ nodes: ["Image"], placement: "replace", measureHeight: true,
    read: readImage, patch: patchImage, source: imageFingerprint, renderer: imageRenderer,
    async load(attrs, signal) {
      const resource = options.resolve ? await options.resolve(attrs.url, signal) : { url: attrs.url };
      if (!isSafeDestination(resource.url, true)) { resource.release?.(); throw new Error("unsafe-image-resource"); }
      return { value: resource, ...(resource.release ? { release: () => resource.release?.() } : {}) };
    },
  }); },
  addCodeMirrorExtensions() { return EditorView.baseTheme({
    ".msfe-node-view": { display: "inline-block", maxWidth: "100%", verticalAlign: "middle" },
    ".msfe-image": { display: "inline-block", maxWidth: "100%", padding: "4px", border: "1px solid #8aa1aa40", background: "transparent", color: "inherit", borderRadius: "6px", verticalAlign: "middle" },
    ".msfe-image img": { display: "block", maxWidth: "100%", maxHeight: "320px", objectFit: "contain" },
  }); },
});

/** @param options - Host resource resolver and image storage. @returns Independently configured image feature. */
export function image(options: ImageOptions = {}) { return Image.configure(options); }

/**
 * Inserts a single-line image with explicit alternative text.
 * @param source - URL, alternative text and optional title.
 * @returns Pure source command encoding Markdown delimiters in decoded fields.
 */
export function insertImage(source: ImageSource): MsfeCommand {
  return state => {
    if (!isSafeDestination(source.url, true)
      || /[\r\n]/u.test(source.alt) || /[\r\n]/u.test(source.title ?? "")
      || state.selection.ranges.length !== 1) return null;
    const range = state.selection.main;
    const title = source.title ? ` "${encodeMarkdownField(source.title, '"')}"` : "";
    return { changes: { from: range.from, to: range.to, insert: `![${encodeMarkdownField(source.alt, "[]*_`<>")}](<${encodeMarkdownField(source.url, "<>")}>${title})` } };
  };
}
