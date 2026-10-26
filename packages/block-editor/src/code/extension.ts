import { CodeBlock } from "@quirekit/extension-code-block";
import type { Attributes, RawCommands } from "@quirekit/core";
import { closeHistory, type Plugin } from "@quirekit/pm";
import type { BlockCodeLanguageChange, BlockCodeDisplayChange } from "./types";
import { codeDisplay, codeDisplayAttributes, sameCodeDisplay } from "./display";
import { renderBlockCode } from "./registry";
import { createCodeHighlightPlugin } from "./highlighting/plugin";
import { blockCodeMenu } from "./menu";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Block product presentation commands, preserving the existing code schema. */
    readonly blockCode: {
      /** @param input - Source-bound language write. @returns Command acceptance. */
      readonly setBlockCodeLanguage: (input: BlockCodeLanguageChange) => ReturnType;
      /** @param input - Persistent source-bound display settings. @returns Command acceptance. */
      readonly setBlockCodeDisplay: (input: BlockCodeDisplayChange) => ReturnType;
    };
  }
}

/** Existing semantic code block with product-owned chrome and syntax decorations. */
export const BlockCode = CodeBlock.extend({
  /** @returns Product display metadata alongside the inherited semantic language. */
  addAttributes() { return { ...(this.parent as (() => Attributes) | undefined)?.(), ...codeDisplayAttributes() }; },
  /** @returns Target-specific actions consumed by any shared block-menu surface. */
  addBlockMenuProviders() { return [blockCodeMenu]; },
  /** @returns Renderer with a framework-free semantic fallback. */
  addNodeView() { return renderBlockCode; },
  /** @returns Existing commands plus a conditional language write without moving selection. */
  addCommands() {
    return { ...(this.parent as (() => Partial<RawCommands>) | undefined)?.(),
      /** @param input - Exact source and display patch. @returns Conditional canonical write. */
      setBlockCodeDisplay: (input: BlockCodeDisplayChange) => ({ editor, tr, dispatch }) => {
        if (!editor.isEditable || !Number.isInteger(input.position) || input.position < 0 || input.position >= tr.doc.content.size) return false;
        const node = tr.doc.nodeAt(input.position), next = { ...input.expected, ...input.patch };
        if (node?.type.name !== "codeBlock" || !sameCodeDisplay(codeDisplay(node.attrs), input.expected)
          || !sameCodeDisplay(next, codeDisplay(next))) return false;
        if (dispatch && !sameCodeDisplay(input.expected, next)) {
          // Attribute steps retain the source boundary, header focus and scroll
          // owner; replacing the node's markup invalidates that mounted identity.
          closeHistory(tr);
          for (const [name, value] of Object.entries(codeDisplay(next))) {
            if (node.attrs[name] !== value) tr.setNodeAttribute(input.position, name, value);
          }
        }
        return true;
      },
      /** @param input - Exact source and desired grammar. @returns Canonical command. */
      setBlockCodeLanguage: (input: BlockCodeLanguageChange) => ({ editor, tr, dispatch }) => {
        if (!editor.isEditable || !Number.isInteger(input.position) || input.position < 0 || input.position >= tr.doc.content.size || input.language.length > 64) return false;
        const node = tr.doc.nodeAt(input.position);
        if (node?.type.name !== "codeBlock" || String(node.attrs.language ?? "") !== input.expected) return false;
        if (dispatch && input.language !== input.expected) closeHistory(tr).setNodeAttribute(input.position, "language", input.language || null);
        return true;
      }
    };
  },
  /** @returns Parent paste behavior and incremental syntax presentation. */
  addProseMirrorPlugins() { return [...((this.parent as (() => Plugin[]) | undefined)?.() ?? []), createCodeHighlightPlugin()]; }
});
