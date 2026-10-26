import type { MarkdownConfig } from "@quirekit/lezer-markdown";
import { fencedContainer } from "../syntax/containers";
import { singleLineMath } from "./single-line";

/** Opt-in dollar-delimited math, isolated from code and escaped delimiters by parser precedence. */
export const mathSyntax: MarkdownConfig = {
  defineNodes: ["InlineMath", "InlineMathMark", "DisplayMath", "DisplayMathMark", "DisplayMathText"],
  parseBlock: [singleLineMath, fencedContainer("DisplayMath", /^\$\$\s*$/u)],
  parseInline: [{ name: "InlineMath", before: "Emphasis",
    /** @param context - Accepted inline section. @param next - Current character code. @param position - Source offset. @returns Accepted end or rejection. */
    parse(context, next, position) {
      if (next !== 36 || context.char(position - 1) === 36 || context.char(position + 1) === 36 || /\s/u.test(context.slice(position + 1, position + 2))) return -1;
      for (let end = position + 1; end < context.end; end++) {
        if (context.char(end) === 10) return -1;
        if (context.char(end) === 92) { end++; continue; }
        if (context.char(end) !== 36) continue;
        if (end === position + 1 || /\s/u.test(context.slice(end - 1, end)) || /\d/u.test(context.slice(end + 1, end + 2))) return -1;
        return context.addElement(context.elt("InlineMath", position, end + 1, [
          context.elt("InlineMathMark", position, position + 1), context.elt("InlineMathMark", end, end + 1),
        ]));
      }
      return -1;
    },
  }],
};
