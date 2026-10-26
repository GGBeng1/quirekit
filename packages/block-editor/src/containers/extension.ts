import { Node, selectionPreset, type RawCommands } from "@quirekit/core";
import { closeHistory, Decoration, DecorationSet, Plugin, TextSelection, type EditorState } from "@quirekit/pm";
import { blockContainerDefaults, blockContainerLabels, blockContainerTone, validBlockContainerAttributes } from "./attributes";
import type { BlockContainerAttributes, BlockContainerChange } from "./types";
import { renderBlockContainer } from "./registry";

declare module "@quirekit/core" {
  /** Container commands added to the public editor command registry. */
  interface Commands<ReturnType> {
    /** Canonical named-container actions; children always remain normal document nodes. */
    readonly blockContainer: {
      /** @param attrs - Presentation for the current container or new wrapper. @returns Command acceptance. */
      readonly setBlockContainer: (attrs: Partial<BlockContainerAttributes>) => ReturnType;
      /** @param change - Exact captured source and changed fields. @returns Command acceptance. */
      readonly updateBlockContainer: (change: BlockContainerChange) => ReturnType;
      /** @param position - Container boundary. @returns Whether its children replaced the wrapper. */
      readonly unwrapBlockContainer: (position: number) => ReturnType;
    };
  }
}

/** Canonical continuous-flow containers, using the same public Prose anatomy as MSFE. */
export const BlockContainer = Node.create({
  name: "blockContainer", group: "block", content: "block+", defining: true,
  /** @returns Shared whole-container coverage without making editable children atomic. */
  addSelection() { return [selectionPreset.container({ id: "block-container", nodeTypes: [this.name] })]; },
  /** @returns Portable attributes; local collapse state is deliberately absent. */
  addAttributes() { return Object.fromEntries(Object.entries(blockContainerDefaults).map(([key, value]) => [key, {
    default: value, rendered: false,
    /** @param field - Deserialized value. */
    validate(field: unknown) { if (!validBlockContainerAttributes({ [key]: field })) throw new RangeError(`Invalid container ${key}`); }
  }])); },
  /** @returns Semantic section parser that excludes presentation headers from the editable body. */
  parseHTML() { return [{ tag: "section[data-qk-block-container]", contentElement: "[data-qk-container-body]", getAttrs: element => {
    const attrs = { kind: element.getAttribute("data-qk-block-container") ?? "highlight", title: element.getAttribute("data-title") ?? "",
      emoji: element.getAttribute("data-emoji") ?? "📌", color: element.getAttribute("data-color") ?? element.getAttribute("data-qk-prose-highlight") ?? "orange", textColor: element.getAttribute("data-qk-prose-highlight-text") };
    return validBlockContainerAttributes(attrs as BlockContainerAttributes) ? attrs : false;
  } }]; },
  /** @param context - Canonical source. @returns All content with portable semantics; exported HTML never hides the body. */
  renderHTML({ node }) {
    const attrs = node.attrs as BlockContainerAttributes;
    return ["section", { class: "qk-prose-container", "data-qk-block-container": attrs.kind, "data-tone": blockContainerTone(attrs.kind),
      "data-title": attrs.title, "data-emoji": attrs.emoji, "data-qk-prose-highlight": attrs.kind === "highlight" ? attrs.color : undefined,
      "data-qk-prose-highlight-text": attrs.textColor ?? undefined, "data-color": attrs.color },
      ["div", { class: "qk-prose-container__header" }, attrs.kind === "highlight" ? attrs.emoji : attrs.title || blockContainerLabels[attrs.kind]],
      ["div", { class: "qk-prose-container__body", "data-qk-container-body": "" }, 0]];
  },
  /** @returns Retained content with product header controls. */
  addNodeView() { return renderBlockContainer; },
  /** @returns Typed mutations, with exact-source guards for delayed controls. */
  addCommands(): Partial<RawCommands> { return {
    setBlockContainer: attrs => ({ editor, tr, commands }) => {
      if (!editor.isEditable || !validBlockContainerAttributes(attrs)) return false;
      const { $from } = tr.selection;
      for (let depth = $from.depth; depth > 0; depth--) if ($from.node(depth).type.name === "blockContainer") {
        return commands.updateBlockContainer({ position: $from.before(depth), expected: $from.node(depth), attrs });
      }
      closeHistory(tr); return commands.wrapIn("blockContainer", { ...blockContainerDefaults, ...attrs });
    },
    updateBlockContainer: ({ position, expected, attrs }) => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !Number.isInteger(position) || position < 0 || position >= tr.doc.content.size
        || !validBlockContainerAttributes(attrs)) return false;
      const node = tr.doc.nodeAt(position);
      if (node !== expected || node.type.name !== "blockContainer") return false;
      if (dispatch) closeHistory(tr).setNodeMarkup(position, undefined, { ...node.attrs, ...attrs });
      return true;
    },
    unwrapBlockContainer: position => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !Number.isInteger(position) || position < 0 || position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(position), $pos = tr.doc.resolve(position);
      if (node?.type.name !== "blockContainer" || !$pos.parent.canReplace($pos.index(), $pos.index() + 1, node.content)) return false;
      if (dispatch) { closeHistory(tr).replaceWith(position, position + node.nodeSize, node.content); tr.setSelection(TextSelection.near(tr.doc.resolve(position))); }
      return true;
    }
  }; },
  /** @returns O(depth) selection facts so entering a hidden descendant reveals only its ancestors. */
  addProseMirrorPlugins() { return [new Plugin({ props: { decorations(state: EditorState) {
    const decorations: Decoration[] = [], seen = new Set<number>();
    for (const $pos of [state.selection.$from, state.selection.$to]) for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name !== "blockContainer" || seen.has($pos.before(depth))) continue;
      seen.add($pos.before(depth));
      decorations.push(Decoration.node($pos.before(depth), $pos.after(depth), {}, { revealContainer: true }));
    }
    return DecorationSet.create(state.doc, decorations);
  } } })]; }
});
