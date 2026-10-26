import { Node, componentView, defineSource } from "@quirekit/msfe-core";
import { msfeWhiteboardAiCapabilities } from "./ai/facts";
import { readWhiteboardSource, patchWhiteboardSource } from "./source";
import { whiteboardPreview } from "./renderer";
import type { MsfeWhiteboardOptions, MsfeWhiteboardPreviewProps } from "./types";
import { commitWhiteboard } from "./commands";
/** Self-contained whiteboard fences; source remains the sole document authority. */
export const MsfeWhiteboard = Node.create<MsfeWhiteboardOptions>({ name: "whiteboard",
  /** @returns Optional product authoring hook. */
  addOptions() { return { open: null }; },
  /** @returns Summary the AI core lists instead of the source data. */
  addAiCapabilities() { return msfeWhiteboardAiCapabilities; },
  /** @returns Named source mutation authority. */
  addCommands() { return { commitWhiteboard }; },
  /** @returns A single complete portable envelope. */
  addAttributes() { return { board: {} }; },
  /** @returns Exact native-fence codec, retaining invalid source unchanged. */
  addSource() { return defineSource({ nodes: ["FencedCode"], read: readWhiteboardSource, patch: patchWhiteboardSource }); },
  /** @returns Incremental static projections with mapped source ownership. */
  addProjectionLayers() {
    const owner = this;
    const renderer: ReturnType<typeof whiteboardPreview> = mount => whiteboardPreview(owner.editor, owner.options)(mount);
    return [{ key: "whiteboard-preview", placement: "block", incremental: true,
      /** @param input - Accepted source query. @returns Static previews for valid semantic matches. */
      build(input) {
      return input.query("whiteboard").matches.map(match => ({ type: "replace" as const, from: match.from, to: match.to, key: String(match.from),
        view: componentView(renderer, { board: match.attrs.board, range: { from: match.from, to: match.to }, readOnly: input.readOnly || input.mode === "locked" } as MsfeWhiteboardPreviewProps,
          (props, offset) => ({ ...props, range: { from: props.range.from + offset, to: props.range.to + offset } })) }));
    } }];
  }
});
