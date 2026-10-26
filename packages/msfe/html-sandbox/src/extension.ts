import { Node, componentView, defineSource } from "@quirekit/msfe-core";
import { readHtmlSandboxSource, patchHtmlSandboxSource } from "./source";
import type { MsfeHtmlSandboxOptions, MsfeHtmlSandboxViewProps } from "./types";
/** Explicit source owner; ordinary HTML and safe HTML sanitizers remain independent. */
export const MsfeHtmlSandbox = Node.create<MsfeHtmlSandboxOptions>({
  name: "htmlSandbox",
  /** @returns Source-only mode until a framework renderer is installed. */
  addOptions() { return { renderer: null }; },
  /** @returns Exact original HTML field. */
  addAttributes() { return { html: {} }; },
  /** @returns The single codec shared by editing and reading. */
  addSource() { return defineSource({ nodes: ["FencedCode"], read: readHtmlSandboxSource, patch: patchHtmlSandboxSource }); },
  /** @returns Incremental block views without source offsets in runtime identity. */
  addProjectionLayers() {
    const renderer = this.options.renderer;
    if (!renderer) return [];
    return [{ key: "html-sandbox-preview", placement: "block", incremental: true,
      /** @param input - Canonical query. @returns Only explicitly installed previews. */
      build(input) { return input.query("htmlSandbox").matches.map(match => ({ type: "replace" as const, from: match.from, to: match.to, key: String(match.from), view: componentView(renderer, { html: match.attrs.html } as MsfeHtmlSandboxViewProps) })); },
    }];
  },
});
