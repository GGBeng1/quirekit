import { InlineContext, type DelimiterType, type InlineParser } from "@quirekit/lezer-markdown";

const opening: DelimiterType = {};

/** Inline notes participate in the same delimiter stack as nested links, code and emphasis. */
export const inlineFootnoteParser: InlineParser = { name: "InlineFootnote", before: "Link",
  /** @param context - Canonical inline owner. @param next - Current character. @param position - Source offset. @returns Accepted delimiter end or rejection. */
  parse(context, next, position) {
    if (next === 94 && context.char(position + 1) === 91) return context.addDelimiter(opening, position, position + 2, true, false);
    if (next !== 93) return -1;
    const index = context.findOpeningDelimiter(opening);
    if (index === null) return -1;
    // An inner link/image consumes its own closing bracket before this note can close.
    for (const type of [InlineContext.linkStart, InlineContext.imageStart]) {
      const inner = context.findOpeningDelimiter(type);
      if (inner !== null && inner > index) return -1;
    }
    const delimiter = context.getDelimiterAt(index)!, content = context.takeContent(index);
    return context.addElement(context.elt("InlineFootnote", delimiter.from, position + 1, [
      context.elt("InlineFootnoteMark", delimiter.from, delimiter.to), ...content,
      context.elt("InlineFootnoteMark", position, position + 1),
    ]));
  },
};
