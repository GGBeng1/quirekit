import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  isMarkActive,
  mergeAttributes,
  type AnyCommands,
  type CommandProps
} from "@quirekit/core";
import { createMarkFlagAiCapability } from "../ai/facts";
import { subscriptDocxCodec, superscriptDocxCodec } from "./docx";

import type { ScriptPositionOptions } from "./types";

/** Word-compatible superscript mark. */
export const Superscript = Mark.create<ScriptPositionOptions>({
  name: "superscript",
  group: "scriptPosition",
  excludes: "scriptPosition",

  /** @returns Superscript as an AI character format. */
  addAiCapabilities() {
    return [createMarkFlagAiCapability({
      mark: this.name, name: "superscript", description: "Superscript text, such as the 2 in mc².", label: "上标",
      apply: (commands, on) => on ? commands.setSuperscript() : commands.unsetSuperscript()
    })];
  },

  /** @returns Native semantic DOCX codec. */
  addDocx() {
    return superscriptDocxCodec;
  },

  /** @returns Default HTML serialization options. */
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  /** @returns Semantic HTML import rule. */
  parseHTML() {
    return [{ tag: "sup" }];
  },

  /** @param props - Resolved mark attributes. @returns Semantic HTML output. */
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  /** @returns Renderer-neutral font scale and baseline displacement. */
  canvasStyle() {
    return {
      fontScale: 0.65,
      baselineShiftEm: 0.35
    };
  },

  /** @returns Transaction-aware authoring commands. */
  addCommands() {
    return createScriptPositionCommands("superscript", "subscript");
  },

  /** @returns Tiptap-compatible superscript shortcut. */
  addKeyboardShortcuts() {
    return { "Mod-.": ({ commands }) => commands.toggleSuperscript() };
  }
});

/** Word-compatible subscript mark. */
export const Subscript = Mark.create<ScriptPositionOptions>({
  name: "subscript",
  group: "scriptPosition",
  excludes: "scriptPosition",

  /** @returns Subscript as an AI character format. */
  addAiCapabilities() {
    return [createMarkFlagAiCapability({
      mark: this.name, name: "subscript", description: "Subscript text, such as the 2 in H₂O.", label: "下标",
      apply: (commands, on) => on ? commands.setSubscript() : commands.unsetSubscript()
    })];
  },

  /** @returns Native semantic DOCX codec. */
  addDocx() {
    return subscriptDocxCodec;
  },

  /** @returns Default HTML serialization options. */
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  /** @returns Semantic HTML import rule. */
  parseHTML() {
    return [{ tag: "sub" }];
  },

  /** @param props - Resolved mark attributes. @returns Semantic HTML output. */
  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  /** @returns Renderer-neutral font scale and baseline displacement. */
  canvasStyle() {
    return {
      fontScale: 0.65,
      baselineShiftEm: -0.15
    };
  },

  /** @returns Transaction-aware authoring commands. */
  addCommands() {
    return createScriptPositionCommands("subscript", "superscript");
  },

  /** @returns Tiptap-compatible subscript shortcut. */
  addKeyboardShortcuts() {
    return { "Mod-,": ({ commands }) => commands.toggleSubscript() };
  }
});

/**
 * Creates set, toggle, and unset commands for one script-position mark.
 *
 * @param name - Owned mark name.
 * @param opposite - Mutually exclusive mark name.
 * @returns Command record bound to the mark names.
 */
function createScriptPositionCommands(
  name: "superscript" | "subscript",
  opposite: "superscript" | "subscript"
): AnyCommands {
  const title = name === "superscript" ? "Superscript" : "Subscript";
  return {
    [`set${title}`]: () => ({ chain, state }: CommandProps) => {
      // Clear the installed opposite before admission checks, including can().
      const transaction = chain();
      if (state.schema.marks[opposite]) transaction.unsetMark(opposite);
      return transaction.setMark(name).run();
    },
    [`toggle${title}`]: () => ({ state, commands }: CommandProps) => (
      isMarkActive(state, name)
        ? commands.unsetMark(name)
        : commands[`set${title}` as "setSuperscript" | "setSubscript"]()
    ),
    [`unset${title}`]: () => ({ commands }: CommandProps) =>
      commands.unsetMark(name)
  };
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Superscript.config.canvasStyle!, {
  kind: "document"
});

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Subscript.config.canvasStyle!, {
  kind: "document"
});
