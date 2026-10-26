import { QuireCommandManager, type AnyCommands } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { collectSelectedWordParagraphs, resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import type { BlockParagraphChange } from "./types";
const types = ["paragraph", "heading"];
/** @returns Neutral authoring intents delegated to the canonical paragraph owner. */
export function paragraphCommands(): AnyCommands {
  return {
    /** @param direction - One indent step. @returns Canonical command. */
    indentBlockParagraph: (direction: -1 | 1) => context => context.editor.isEditable && (direction === 1
      ? context.commands.increaseWordParagraphIndentation() : direction === -1 && context.commands.decreaseWordParagraphIndentation()),
    /** @param change - A single field, never an entire mixed paragraph snapshot. @returns Canonical field mutation. */
    setBlockParagraph: (change: BlockParagraphChange) => context => {
      if (!context.editor.isEditable) return false;
      const { field, value } = change;
      if (field === "alignment") return typeof value === "string" && ["start", "center", "end", "justify"].includes(value)
        && context.commands.setWordParagraphProperties({ properties: { alignment: value } });
      if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1000) return false;
      if (field === "line") return value >= 0.5 && value <= 10 && context.commands.setWordParagraphLineSpacing({ line: { rule: "auto", value: Math.round(value * 240) } });
      if (field === "before" || field === "after") return value >= 0 && context.commands.setWordParagraphSpacingSide({ side: field, unit: "dxa", value: Math.round(value * 20) });
      if (!["start", "end", "firstLine"].includes(field) || (field !== "firstLine" && value < 0)) return false;
      const targets = collectSelectedWordParagraphs(context.state, types), selection = context.tr.selection.getBookmark();
      const manager = new QuireCommandManager({ editor: context.editor, state: context.state });
      let changed = false;
      // Each paragraph retains its other sides. All owner commands share this one
      // transaction, then the exact text/block selection is restored for the UI.
      for (const target of targets) {
        const current = resolveWordParagraphFormatting(target.node.attrs.wordParagraph);
        context.tr.setSelection(TextSelection.create(context.tr.doc, target.position + 1));
        changed = manager.buildProps(context.tr, !!context.dispatch).commands.setWordParagraphIndentation({ indentation: { ...current.indentation, [field]: { unit: "dxa", value: Math.round(value * 20) } } }) || changed;
      }
      context.tr.setSelection(selection.resolve(context.tr.doc));
      return changed;
    }
  };
}
