import { Extension, decodeMarkdownString } from "@quirekit/msfe-core";
import { Decoration, WidgetType, type EditorView } from "@quirekit/cm-view";

/** Safe text-only projection of a confirmed escaped character or entity. */
class LiteralWidget extends WidgetType {
  /** @param text - Decoded prose; never interpreted as HTML. */
  constructor(private readonly text: string) { super(); }
  /** @param other - Previous text projection. @returns Whether the DOM can be retained. */
  eq(other: LiteralWidget): boolean { return this.text === other.text; }
  /** @param view - Canonical DOM owner. @returns Non-editable text that maps to the original source. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = "msfe-literal"; span.textContent = this.text;
    return span;
  }
  /** @returns Pointer events remain with CodeMirror so selecting reveals source. */
  ignoreEvent(): boolean { return false; }
}

/** Confirmed prose literals and line breaks; code content is never decoded. */
export const TextLiterals = Extension.create({ name: "textLiterals",
  /** @returns Syntax-owned replacements, with exact source fallback while active. */
  addProjections: () => [{ nodes: ["Escape", "Entity", "HardBreak", "LinkReference"],
    /** @param input - Parser-confirmed prose and source activity. @returns Safe source-derived decoration. */
    decorate({ state, node, active }) {
      if (node.name === "LinkReference") return [Decoration.mark({ class: "msfe-reference-definition" }).range(node.from, node.to)];
      if (active) return [];
      const end = Math.min(node.to, state.doc.lineAt(node.from).to);
      if (end <= node.from) return [];
      if (node.name === "HardBreak") return [Decoration.replace({}).range(node.from, end)];
      return [Decoration.replace({ widget: new LiteralWidget(decodeMarkdownString(state.sliceDoc(node.from, end))) }).range(node.from, end)];
    },
  }],
});
