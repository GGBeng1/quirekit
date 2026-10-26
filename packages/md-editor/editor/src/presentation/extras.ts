import { DefinitionList, Math, Mermaid, TextDiagrams, Footnotes, Frontmatter, Subscript, Superscript, InsertedText, Highlight } from "@quirekit/msfe-markdown-extras";
import { Decoration } from "@quirekit/cm-view";
import { Extension, type AnyExtension } from "@quirekit/msfe-core";
import type { MdExtraOptions } from "../types";
import { mdMermaidEnabled, mdTextDiagramsEnabled } from "./capabilities";
import { fenceInput, exitInput } from "../input/behavior";
import { prefixBoundary } from "./boundaries/blocks";

/** Frontmatter owns literal input and complete-boundary exit alongside its grammar. */
const ProseFrontmatter = Frontmatter.extend({
  /** @returns Source-safe frontmatter input; custom replacements can override this same hook. */
  addBlockInput: () => [{ nodes: ["Frontmatter"], enter: fenceInput, lineBreak: "native", exit: exitInput }],
});

/** Real Prose dl/dt/dd wrappers own the definition layout; the body stays native editable text. */
const ProseDefinitionList = DefinitionList.extend({ addCodeMirrorExtensions: () => [],
  /** @returns Definition markers retain the same prefix navigation and deletion contract. */
  addEditingBoundaries: () => [prefixBoundary(["DefinitionDescription"], "DefinitionMark")],
  addProjections: () => [{ nodes: ["DefinitionDescription"],
    /** @param input - Confirmed description. @returns Only hidden source punctuation, with no independent row skin. */
    decorate({ state, node, active }) {
      const mark = node.getChild("DefinitionMark");
      if (!mark || active) return [];
      return [Decoration.replace({}).range(mark.from, mark.to + Number(state.sliceDoc(mark.to, mark.to + 1) === " "))];
    },
  }],
});

/** @param options - Explicit per-feature replacement/removal. @returns Independent descriptors, never a second Markdown parser. */
export function mdExtraExtensions(options: MdExtraOptions | false = {}): readonly AnyExtension[] {
  if (options === false) return [];
  const defaults = { math: Math, mermaid: Mermaid, textDiagram: TextDiagrams, footnotes: Footnotes, definitionList: ProseDefinitionList,
    subscript: Subscript, superscript: Superscript, insertedText: InsertedText, highlight: Highlight, frontmatter: ProseFrontmatter };
  const features = Object.entries(defaults).flatMap(([key, value]) => {
    const feature = options[key as keyof MdExtraOptions];
    return feature === false ? [] : [feature ?? value];
  });
  return [...features, Extension.create({ name: "mdExtraPresentation",
    /** @returns Reading capabilities attached to the same immutable source snapshot. */
    addCodeMirrorExtensions: () => [mdMermaidEnabled.of(options.mermaid !== false), mdTextDiagramsEnabled.of(options.textDiagram !== false)],
  })];
}
