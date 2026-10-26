import { Extension, type MsfeEditor, type MsfeResult } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import { htmlProjection, htmlWork } from "./render/runtime";
import { renderingSetting } from "./setting";
import { htmlSelection } from "./render/selection";
import type { HtmlOptions, HtmlRendering, HtmlStorage, HtmlWork } from "./types";

/** Optional HTML extension; source remains the default and executable tags can never be enabled. */
export const Html = Extension.create<HtmlOptions, HtmlStorage>({
  name: "html",
  /** @returns Source-first defaults; safe rendering requires explicit host opt-in. */
  addOptions() { return { rendering: "source" }; },
  /** @returns This instance's rendering preference across document replacement. */
  addStorage() { return { rendering: this.options.rendering }; },
  /** @returns Presentation, native selection and physical-line geometry extensions. */
  addCodeMirrorExtensions() { return [renderingSetting.extension(() => this.storage.rendering), htmlProjection(this.options), htmlSelection,
    EditorView.baseTheme({ ".cm-line.msfe-html-delimiter-line": { height: "0", minHeight: "0", overflow: "hidden", paddingBlock: "0" },
      ".msfe-html-p, .msfe-html-div, .msfe-html-h1, .msfe-html-h2, .msfe-html-h3, .msfe-html-h4, .msfe-html-h5, .msfe-html-h6": { display: "inline", margin: "0" },
      ".msfe-html-ul, .msfe-html-ol, .msfe-html-blockquote, .msfe-html-pre": { display: "inline-block", margin: "0", verticalAlign: "top" },
      ".msfe-html-table": { display: "inline-table", margin: "0", verticalAlign: "top" },
      ".msfe-html-token": { maxWidth: "100%" } })]; },
  /** @param transaction - Accepted transaction, including input-deferred presentation requests. */
  onTransaction({ transaction }) { this.storage.rendering = renderingSetting.requested(transaction.state)!; },
});

/** @param editor - Installed instance. @param rendering - Requested source/safe preference. @returns Presentation acceptance, also in readonly mode. */
export function setHtmlRendering(editor: MsfeEditor, rendering: HtmlRendering): MsfeResult { return renderingSetting.set(editor, rendering); }
/** @param editor - Installed instance. @returns Applied rendering preference, or undefined when not installed. */
export function getHtmlRendering(editor: MsfeEditor): HtmlRendering | undefined { return renderingSetting.read(editor.state); }
/** @param editor - Mounted instance. @returns A detached work snapshot, or undefined after disposal. */
export function getHtmlWork(editor: MsfeEditor): Readonly<HtmlWork> | undefined {
  if (editor.scope.disposed) return undefined;
  const view = EditorView.findFromDOM(editor.element), work = view && htmlWork.get(view);
  return work ? { ...work } : undefined;
}
