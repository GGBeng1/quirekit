import { Node, defineSource } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import { containerSyntax } from "./syntax";
import type { ContainerOptions, ContainerStorage } from "./types";
import { readContainer } from "./query";
import { containerState } from "./state";
import { containerLayers, projectContainer } from "./projection";

/** Named block containers with native editable bodies and the existing Callout design vocabulary. */
export const CustomContainer = Node.create<ContainerOptions, ContainerStorage>({ name: "customContainer", priority: 110,
  /** @returns Common documentation roles; hosts can register more literal names. */
  addOptions: () => ({ types: ["info", "note", "tip", "important", "warning", "danger", "caution", "details"], detailsOpen: false,
    toggleLabel: (expanded, title) => `${expanded ? "Collapse" : "Expand"}: ${title}` }),
  /** @returns Per-installation view state; it is reset on document replacement. */
  addStorage() { return { disclosure: containerState(this.options.detailsOpen) }; },
  /** @returns Canonical state dependency without document mutations or text-history effects. */
  addState() { return [this.storage.disclosure]; },
  /** @returns One canonical composite grammar configured per instance. */
  addMarkdownExtensions() { return containerSyntax(this.options.types); },
  /** @returns Complete, queryable source containers. */
  addSource: () => defineSource({ nodes: ["CustomContainer"],
    read: readContainer,
    patch: () => null,
  }),
  /** @returns Native body lines and source-revealing fences; no independent contenteditable or block HTML. */
  addProjections: () => [{ nodes: ["CustomContainer"], decorate: projectContainer }],
  /** @returns Native fold ranges and host-context disclosure controls. */
  addProjectionLayers() { return containerLayers(this.storage.disclosure, this.options, () => this.editor); },
  /** @returns A closing fence that takes no height until the caret reveals it; its BR stays measurable for selection. */
  addCodeMirrorExtensions: () => EditorView.baseTheme({
    ".cm-line.msfe-container-end-hidden": { height: "0", minHeight: "0", lineHeight: "0", fontSize: "inherit", padding: "0", overflow: "visible", position: "relative", display: "block" },
    ".cm-line.msfe-container-end-hidden > br": { position: "absolute" },
  }),
});
