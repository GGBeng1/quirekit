import { Extension, Node, selectionPreset } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import type {} from "@quirekit/editor-ui";
import { blockMathCommands } from "./commands";
import { renderBlockMath } from "./view";
import { openBlockMath } from "./tasks";

/** @param display - Block or inline placement. @returns Source-preserving atom using the public math model. */
function formulaNode(display: boolean) {
  return Node.create({
    name: display ? "displayMath" : "inlineMath", group: display ? "block" : "inline", inline: !display,
    atom: true, selectable: true,
    /** @returns Exact source; imported unsupported grammar remains recoverable. */
    addAttributes() { return { latex: { default: "", rendered: false,
      /** @param value - Untrusted persisted attribute. */
      validate(value: unknown) { if (typeof value !== "string" || value.length > 16384) throw new RangeError("Invalid formula source"); }
    } }; },
    /** @returns Source-preserving HTML rule, excluding generated SVG. */
    parseHTML() { return [{ tag: `${display ? "div" : "span"}[data-qk-math="${display ? "block" : "inline"}"]`, getAttrs: element => ({ latex: element.getAttribute("data-latex") ?? element.textContent ?? "" }) }]; },
    /** @param context - Canonical node. @returns Portable source with explicit semantic identity. */
    renderHTML({ node }) { return [display ? "div" : "span", { "data-qk-math": display ? "block" : "inline", "data-latex": node.attrs.latex }, node.attrs.latex]; },
    /** @param context - Canonical node. @returns Plain-text clipboard fallback retaining formula syntax. */
    renderText({ node }) { return display ? `$$\n${node.attrs.latex}\n$$` : `$${node.attrs.latex}$`; },
    /** @returns Existing document selection ownership for atoms. */
    addSelection() { const options = { id: this.name, nodeTypes: [this.name] }; return [display ? selectionPreset.atomicBlock(options) : selectionPreset.inline(options)]; },
    /** @returns Retained, asynchronously rendered preview. */
    addNodeView() { return renderBlockMath; }
  });
}

/** Continuous-flow host for the independent formula core and visual editor. */
export const BlockMath = Extension.create({
  name: "blockMath",
  // A selected formula opens its editor before the ordinary Enter paragraph fallback.
  keyboardShortcutPriority: 200,
  /** @returns Both source-bearing formula placements. */
  addExtensions() { return [formulaNode(false), formulaNode(true)]; },
  /** @returns Typed document mutations, usable without the product UI. */
  addCommands() { return blockMathCommands(); },
  /** @returns Keyboard activation of the exact selected atom. */
  addKeyboardShortcuts() { return { Enter: () => {
    const editor = this.editor; if (!editor) return false;
    const selection = editor.state.pm.selection;
    return selection instanceof NodeSelection && ["inlineMath", "displayMath"].includes(selection.node.type.name)
      && openBlockMath(editor, selection.node.type.name === "displayMath", { position: selection.from });
  } }; },
  /** @returns Formula-specific actions from the same authoring task used by double click. */
  addBlockMenuProviders() { return [{ id: "math", getItems: ({ editor, block }) => block.node.type.name === "displayMath"
    ? [{ value: "edit", label: "编辑公式", icon: "sigma", run: () => openBlockMath(editor, true, { position: block.from }) }] : [] }]; }
});
