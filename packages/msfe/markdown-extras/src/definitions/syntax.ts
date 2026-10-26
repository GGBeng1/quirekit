import type { MarkdownConfig, BlockContext, Line } from "@quirekit/lezer-markdown";
import type { DeferredTerm } from "./types";

const deferred = new WeakMap<BlockContext, DeferredTerm>();

/** @param line - Container-relative physical line. @returns A valid definition marker, including its required whitespace. */
function definitionMarker(line: Line): string | undefined { return /^[:~][ \t]+/u.exec(line.text.slice(line.pos))?.[0]; }

/** @param context - Existing block stack. @returns Whether a definition already owns this continuation. */
function inDefinition(context: BlockContext): boolean { return context.parentType().name === "DefinitionDescription"; }

/** @param context - Canonical line owner. @param line - Current term candidate. @returns Whether the next physical line confirms a description in the same outer container. */
function isTerm(context: BlockContext, line: Line): boolean {
  const next = context.peekLine();
  return !/[^ \t>]/u.test(next.slice(0, line.basePos)) && /^ {0,3}[:~][ \t]+/u.test(next.slice(line.basePos));
}

/** Definition lists keep term and description siblings inside one canonical composite. */
export const definitionSyntax: MarkdownConfig = {
  defineNodes: ["DefinitionTerm", "DefinitionMark", { name: "DefinitionList", block: true,
    /** @param context - Current stack. @param line - Next source line. @returns Whether explicit list structure continues; native paragraphs still own lazy continuation. */
    composite(context, line) { return line.pos === line.text.length || line.indent >= line.baseIndent + 4 || !!definitionMarker(line) || isTerm(context, line); },
  }, { name: "DefinitionDescription", block: true,
    /** @param _context - Accepted container stack. @param line - Current continuation. @returns Four-column body membership, with canonical lazy paragraph continuation. */
    composite(_context, line) {
      if (line.pos === line.text.length) return true;
      if (line.indent < line.baseIndent + 4) return false;
      line.moveBaseColumn(line.baseIndent + 4); return true;
    },
  }],
  parseBlock: [{ name: "DefinitionDescription", before: "LinkReference",
    /** @param context - Canonical block owner. @param line - Explicit description line. @returns Native body ownership when a definition marker is present. */
    parse(context, line) {
      const marker = definitionMarker(line);
      const term = deferred.get(context);
      if (term && term.descriptionLine === context.lineStart && marker) {
        deferred.delete(context);
        // The leaf phase confirmed the blank separator. Start the native list only now,
        // when the eager parser can own its composite, using the original term offset.
        context.startComposite("DefinitionList", term.from - context.lineStart);
        context.addElement(context.elt("DefinitionTerm", term.from, term.from + term.text.length, context.parser.parseInline(term.text, term.from)));
        return null;
      }
      if (!marker || line.indent - line.baseIndent >= 4 || context.parentType().name !== "DefinitionList") return false;
      const start = context.lineStart + line.pos;
      context.startComposite("DefinitionDescription", line.pos);
      context.addElement(context.elt("DefinitionMark", start, start + marker.length));
      line.moveBase(line.pos + marker.length); return null;
    },
    /** @param context - Existing blocks. @param line - Next line. @returns Explicit adjacent definitions interrupt only an existing description. */
    endLeaf(context, line) { return inDefinition(context) && line.indent - line.baseIndent < 4 && (!!definitionMarker(line) || isTerm(context, line)); },
  }, { name: "DefinitionTerm", before: "SetextHeading",
    /** @param context - Canonical parser. @param leaf - Candidate single-line term. @returns A deferred decision using only public, one-line lookahead. */
    leaf(context, leaf) {
      const blank = context.peekLine();
      if (!/^[ \t>]*$/u.test(blank)) return null;
      const physicalEnd = leaf.start + leaf.content.length;
      const prefix = leaf.start - context.lineStart;
      return {
        /** @returns Non-blank continuation makes this an ordinary multi-line paragraph. */
        nextLine: () => false,
        /** @param current - Parser stopped on the following separator. @param complete - Final leaf content. @returns Whether a single term precedes one blank line and a confirmed description. */
        finish(current, complete) {
          if (complete.content.includes("\n") || current.lineStart !== physicalEnd + 1) return false;
          const next = current.peekLine();
          if (/[^ \t>]/u.test(next.slice(0, prefix)) || !/^ {0,3}[:~][ \t]+/u.test(next.slice(prefix))) return false;
          deferred.set(current, { from: complete.start, text: complete.content, descriptionLine: current.lineStart + blank.length + 1 });
          return true;
        },
      };
    },
    /** @param context - Canonical block stack. @param line - One source term. @returns A list composite with native inline term content. */
    parse(context, line) {
      if (line.indent - line.baseIndent >= 4 || line.pos === line.text.length || !isTerm(context, line)) return false;
      if (context.parentType().name !== "DefinitionList") context.startComposite("DefinitionList", line.pos);
      const from = context.lineStart + line.pos, text = line.text.slice(line.pos);
      context.addElement(context.elt("DefinitionTerm", from, from + text.length, context.parser.parseInline(text, from)));
      line.moveBase(line.text.length); return null;
    },
  }],
};
