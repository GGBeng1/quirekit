import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  mergeAttributes,
  type CommandProps
} from "@quirekit/core";
import { createMarkFlagAiCapability } from "../ai/facts";
import { doubleStrikeDocxCodec } from "./docx";

/** Options for the Word-compatible double-strike mark. */
export interface DoubleStrikeOptions {
  /** HTML attributes added when the mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Word-compatible double-strikethrough mark. */
export const DoubleStrike = Mark.create<DoubleStrikeOptions>({
  name: "doubleStrike",

  /** @returns Double strikethrough as an AI character format. */
  addAiCapabilities() {
    return [createMarkFlagAiCapability({
      mark: this.name, name: "doubleStrike", description: "Double strikethrough.", label: "双删除线",
      apply: (commands, on) => on ? commands.setDoubleStrike() : commands.unsetDoubleStrike()
    })];
  },

  addDocx() {
    return doubleStrikeDocxCodec;
  },

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [
      { tag: "span[data-qk-double-strike]" },
      {
        style: "text-decoration",
        getAttrs: (style) => (
          style.includes("double") && style.includes("line-through") ? {} : false
        )
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        "data-qk-double-strike": "true",
        style: "text-decoration-line: line-through; text-decoration-style: double"
      }
    ), 0];
  },

  canvasStyle() {
    return { textDecoration: ["double-line-through"] };
  },

  addCommands() {
    return {
      setDoubleStrike: () => ({ chain }: CommandProps) =>
        chain().unsetMark("strike").setMark(this.name).run(),
      toggleDoubleStrike: () => ({ chain, editor }: CommandProps) => (
        editor.isActive(this.name)
          ? chain().unsetMark(this.name).run()
          : chain().unsetMark("strike").setMark(this.name).run()
      ),
      unsetDoubleStrike: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  }
});

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(DoubleStrike.config.canvasStyle!, {
  kind: "document"
});
