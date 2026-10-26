import type { BlockParser } from "@quirekit/lezer-markdown";

/** A display formula occupies a complete container-relative line; prose dollars stay inline/source. */
export const singleLineMath: BlockParser = { name: "SingleLineDisplayMath", before: "HorizontalRule",
  /** @param context - Canonical block parser. @param line - Composite-relative source. @returns Whether a complete display block was accepted. */
  parse(context, line) {
    if (line.indent - line.baseIndent >= 4) return false;
    const text = line.text.slice(line.pos).trimEnd();
    if (!text.startsWith("$$") || !text.endsWith("$$") || text.length <= 4) return false;
    const body = text.slice(2, -2);
    if (!body.trim() || body.includes("$$") || (body.match(/\\+$/u)?.[0].length ?? 0) % 2) return false;
    const from = context.lineStart + line.pos, to = from + text.length;
    context.addElement(context.elt("DisplayMath", from, to, [
      context.elt("DisplayMathMark", from, from + 2), context.elt("DisplayMathText", from + 2, to - 2), context.elt("DisplayMathMark", to - 2, to),
    ]));
    context.nextLine(); return true;
  },
};
