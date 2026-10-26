import { Node, componentView, defineSource } from "@quirekit/msfe-core";
import { readDataViewSource, patchDataViewSource } from "./source";
import { commitDataView } from "./commands";
import { dataViewProjection } from "./preview";
import { dataViewSurface } from "./surface";
import { dataViewClipboard } from "./clipboard";
import type { MsfeDataViewOptions, MsfeDataViewPreview } from "./types";

/** MIT source-first multidimensional table fences. */
export const MsfeDataView = Node.create<MsfeDataViewOptions>({
  name: "dataView",
  /** @returns Hostless defaults. */ addOptions() { return {open: null}; },
  /** @returns Single source authority. */ addAttributes() { return {dataView: {}}; },
  /** @returns Atomic source mutation. */ addCommands() { return {commitDataView}; },
  /** @returns Paste-only identity separation, without selection subscriptions. */
  addCodeMirrorExtensions() { return [dataViewClipboard()]; },
  /** @returns Strict source codec with literal fallback for unsupported content. */
  addSource() { return defineSource({nodes: ["FencedCode"], read: readDataViewSource, patch: patchDataViewSource}); },
  /** @returns Incremental preview with mapped range props. */
  addProjectionLayers() {
    const owner = this;
    const renderer = owner.options.render ? dataViewSurface(() => owner.editor, owner.options.render) : dataViewProjection(() => owner.editor, owner.options.open);
    return [{key: "data-view-preview", placement: "block", incremental: true,
      /** @param input - Accepted semantic source query. @returns Bounded static replacements. */
      build(input) {
        return input.query("dataView").matches.map(match => ({type: "replace" as const, from: match.from, to: match.to, key: String(match.from),
          view: componentView(renderer, {dataView: match.attrs.dataView, range: {from: match.from, to: match.to}, readOnly: input.readOnly || input.mode === "locked"} as MsfeDataViewPreview,
            (props, offset) => ({...props, range: {from: props.range.from + offset, to: props.range.to + offset}}))}));
      }
    }];
  }
});
