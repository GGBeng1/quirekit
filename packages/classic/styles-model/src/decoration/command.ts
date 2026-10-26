import type { CommandSpec } from "@quirekit/core";
import { closeHistory, Transaction } from "@quirekit/pm";
import {
  applyWordParagraphDecoration, collectSelectedWordParagraphs,
  isWordParagraphDecorationOperation, resolveWordParagraphFormatting,
  type WordParagraphDecorationOperation
} from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphAppearance, resolveWordParagraphStyleRegistry } from "../model";
import type { WordParagraphDecorationCommandOptions } from "./types";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Style-aware paragraph appearance operations supplied by WordStyles. */
    readonly wordParagraphDecoration: {
      /** Apply one appearance-only operation to each covered paragraph. */
      setWordParagraphDecoration: (operation: WordParagraphDecorationOperation, options?: WordParagraphDecorationCommandOptions) => ReturnType;
      /** End an accepted continuous edit without changing content or adding an undo event. */
      finishWordParagraphDecorationEdit: () => ReturnType;
    };
  }
}

/** @returns A history-only boundary command; probing never mutates history. */
export function createFinishWordParagraphDecorationEditCommand(): CommandSpec {
  return () => context => {
    if (context.dispatch) context.dispatch(closeHistory(context.tr));
    return true;
  };
}

/**
 * Creates the style-aware atomic command without coupling paragraph back to styles.
 * @param nodeNames - Registered paragraph and heading owners.
 * @returns Validated command participating in native history and protection filters.
 */
export function createSetWordParagraphDecorationCommand(nodeNames: readonly string[]): CommandSpec {
  return (value, options?: WordParagraphDecorationCommandOptions) => context => {
    if (!context.editor.isEditable || !isWordParagraphDecorationOperation(value)) return false;
    const targets = collectSelectedWordParagraphs(context.state, nodeNames);
    if (targets.length === 0) return false;
    const registry = resolveWordParagraphStyleRegistry(context.state.doc.attrs.wordStyleRegistry);
    // Prepare against the live document. A rejected filter never receives a
    // partially edited shared chain transaction.
    const candidate = new Transaction(context.state);
    const updates = targets.map(target => {
      const direct = resolveWordParagraphFormatting(target.node.attrs.wordParagraph);
      const effective = resolveWordParagraphAppearance(registry, direct).paragraph;
      const next = applyWordParagraphDecoration(direct, effective, value);
      return { ...target, direct, next };
    }).filter(target => JSON.stringify(target.direct) !== JSON.stringify(target.next));
    for (const target of updates) candidate.setNodeMarkup(target.position, undefined,
      { ...target.node.attrs, wordParagraph: target.next });
    if (!context.state.filterTransaction(candidate)) return false;
    if (context.dispatch && updates.length > 0) {
      if (options?.continueHistory !== true) closeHistory(context.tr);
      for (const target of updates) context.tr.setNodeMarkup(target.position, undefined,
        { ...target.node.attrs, wordParagraph: target.next });
      context.dispatch(context.tr);
    }
    return true;
  };
}
