import { Mark, defineSource } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";
import { Subscript as subscriptSyntax, Superscript as superscriptSyntax, type MarkdownConfig } from "@quirekit/lezer-markdown";
import { pairedMark } from "./delimiters";

/**
 * Defines an optional semantic mark using the public Prose HTML vocabulary.
 * @param name - Independent extension identity.
 * @param kind - Confirmed syntax family.
 * @param tagName - Semantic inline element, styled by the host's Prose.
 * @param syntax - Canonical parser contribution.
 * @returns Inheritable and independently installable source-first mark.
 */
function inlineMark(name: string, kind: string, tagName: string, syntax: MarkdownConfig) {
  return Mark.create({ name,
    /** @returns Grammar added to the existing parser. */
    addMarkdownExtensions: () => syntax,
    /** @returns Queryable formatting with no generated source attributes. */
    addSource: () => defineSource({ nodes: [kind], read: () => ({}), patch: () => null }),
    /** @returns Native inline text with source delimiters revealed while editing. */
    addProjections: () => [{ nodes: [kind],
      /** @param input - Confirmed delimiter family. @returns Semantic marks without independent editable content. */
      decorate({ node, active, from, to }) {
        const marks = node.getChildren(`${kind}Mark`), first = marks[0], last = marks.at(-1);
        if (!first || !last || first.to >= last.from) return [];
        const start = Math.max(from, first.to), end = Math.min(to, last.from);
        const result = start < end ? [Decoration.mark({ tagName, class: `msfe-${name} qk-prose-node` }).range(start, end)] : [];
        if (!active) for (const mark of marks) if (mark.from >= from && mark.to <= to) result.push(Decoration.replace({}).range(mark.from, mark.to));
        return result;
      },
    }],
  });
}

/** Optional single-tilde subscript; GFM double-tilde deletion retains its own grammar. */
export const Subscript = inlineMark("subscript", "Subscript", "sub", subscriptSyntax);
/** Optional caret superscript, installed after the explicit inline-footnote parser. */
export const Superscript = inlineMark("superscript", "Superscript", "sup", superscriptSyntax);
/** Optional inserted-text underline; no source conversion or document revision tracking. */
export const InsertedText = inlineMark("insertedText", "InsertedText", "ins", pairedMark("InsertedText", "++"));
/** Optional semantic highlight using the same mark element as the public Prose component. */
export const Highlight = inlineMark("highlight", "Highlight", "mark", pairedMark("Highlight", "=="));
