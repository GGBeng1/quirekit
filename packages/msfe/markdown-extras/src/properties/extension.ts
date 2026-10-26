import { EditorView } from "@quirekit/cm-view";
import { Node, defineSource } from "@quirekit/msfe-core";
import { DOCUMENT_PROPERTIES_LIMIT, readDocumentProperties } from "./read";
import { propertiesCollapsed, propertiesDocument, propertiesEnabled } from "./state";
import { propertiesLayer } from "./projection";
import type { DocumentPropertiesData, DocumentPropertiesOptions, DocumentPropertiesStorage } from "./types";

/** Opt-in YAML property presentation over the existing Frontmatter source grammar. */
export const DocumentProperties = Node.create<DocumentPropertiesOptions, DocumentPropertiesStorage>({ name: "documentProperties", requires: ["frontmatter"],
  /** @returns Defaults applied only when this extension is explicitly installed. */
  addOptions: () => ({ enabled: true, defaultCollapsed: false, locale: "zh-CN" }),
  /** @returns Per-document presentation defaults. */
  addStorage() { return { enabled: propertiesEnabled(this.options.enabled), collapsed: propertiesCollapsed(this.options.defaultCollapsed) }; },
  /** @returns Presentation preferences plus a new-document identity for rejecting retired forms. */
  addState() { return [this.storage.enabled, this.storage.collapsed, propertiesDocument]; },
  /** @returns Root-only bounded YAML decoding; the default Frontmatter extension never interprets values. */
  addSource: () => defineSource<DocumentPropertiesData>({ nodes: ["Frontmatter"],
    read: (document, node) => node.from <= 1 && node.parentKind === "Document" && node.to <= DOCUMENT_PROPERTIES_LIMIT && node.children("FrontmatterMark").length === 2
      ? readDocumentProperties(document.slice(0, node.to)) : null,
    patch: () => null,
  }),
  /** @returns Source-preserving optional table with explicit state dependencies. */
  addProjectionLayers() { return [propertiesLayer(this.name, this.storage, this.options, () => this.editor)]; },
  /** @returns Styles scoped to this public component, leaving literal Frontmatter unchanged. */
  addCodeMirrorExtensions: () => EditorView.baseTheme({
    '[data-qk-prose="pre"]:has(> .msfe-component-view[data-msfe-component^="document-properties/"])': {
      padding: "0", border: "0", background: "transparent", fontFamily: "inherit", whiteSpace: "normal", overflow: "visible",
    },
    ".msfe-document-properties": { fontFamily: "var(--qk-type-body-font-family, sans-serif)", whiteSpace: "normal", fontSize: "14px", lineHeight: "1.5" },
    ".msfe-document-properties > dl:not([hidden])": { display: "grid", gridTemplateColumns: "minmax(80px, 160px) 1fr", gap: "8px 16px", margin: "0 0 8px" },
    ".msfe-document-properties > dl > dd": { margin: "0", overflowWrap: "anywhere" },
  }),
});
