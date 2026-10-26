import type { InlineBoundaryRule } from "@quirekit/msfe-core";
import type { MdEditorExtensionOptions } from "../types";

/** Product defaults; custom grammars can replace this list through the public preset options. */
export const mdInlineBoundaries: readonly InlineBoundaryRule[] = [
  { nodes: ["InlineCode"], marker: "CodeMark", behavior: "split" },
  { nodes: ["Emphasis", "StrongEmphasis"], marker: "EmphasisMark", behavior: "content" },
  { nodes: ["Strikethrough"], marker: "StrikethroughMark", behavior: "content" },
  ...["Highlight", "InsertedText", "Subscript", "Superscript"].map(name => ({ nodes: [name], marker: `${name}Mark`, behavior: "content" as const })),
];

/** @param options - Installed presentation features and explicit host policies. @returns Default rules only for enabled owners, or the host's complete replacement. */
export function configuredInlineBoundaries(options: MdEditorExtensionOptions): readonly InlineBoundaryRule[] {
  if (options.inlineBoundaries) return options.inlineBoundaries;
  const features = options.features, extras = options.extras === false ? false : options.extras;
  const enabled = new Map<string, boolean>([
    ["InlineCode", features?.inlineCode !== false], ["Emphasis", features?.emphasis !== false],
    ["StrongEmphasis", features?.bold !== false], ["Strikethrough", features?.strikethrough !== false],
    ["Highlight", extras !== false && extras?.highlight !== false], ["InsertedText", extras !== false && extras?.insertedText !== false],
    ["Subscript", extras !== false && extras?.subscript !== false], ["Superscript", extras !== false && extras?.superscript !== false],
  ]);
  return mdInlineBoundaries.flatMap(rule => {
    const nodes = rule.nodes.filter(node => enabled.get(node));
    return nodes.length ? [{ ...rule, nodes }] : [];
  });
}
