import { InputRule } from "@quirekit/core";

/** Matches a decimal automatic-numbering prefix at paragraph start. */
export const wordOrderedListInputRegex = /^(\d+)\.\s$/u;

/** Matches a literal bullet automatic-list prefix at paragraph start. */
export const wordBulletListInputRegex = /^[-*]\s$/u;

/** Matches unchecked and checked task prefixes at paragraph start. */
export const wordTaskListInputRegex = /^\[([ xX])\]\s$/u;

/**
 * Creates flat Word list input rules backed by the command family.
 *
 * @returns Task, ordered, and bullet rules in conflict-safe priority order.
 */
export function createWordNumberingInputRules(): readonly InputRule[] {
  return [
    new InputRule({
      find: wordTaskListInputRegex,
      handler({ chain, match, range }) {
        const checked = (match[1] ?? "").toLowerCase() === "x";
        chain()
          .deleteRange(range)
          .toggleWordTaskList({ checked })
          .run();
      }
    }),
    new InputRule({
      find: wordOrderedListInputRegex,
      handler({ chain, match, range }) {
        const start = Number(match[1] ?? 1);
        // Unsupported starts stay literal; a failed toggle must not consume typing.
        if (!Number.isSafeInteger(start) || start < 1) return null;
        chain()
          .deleteRange(range)
          .toggleWordOrderedList({ start })
          .run();
      }
    }),
    new InputRule({
      find: wordBulletListInputRegex,
      handler({ chain, range }) {
        chain().deleteRange(range).toggleWordBulletList().run();
      }
    })
  ];
}
