import { Extension, type ProjectionDecoration } from "@quirekit/msfe-core";

/** GitHub's five callout roles reuse confirmed quote bodies and the canonical native selection. */
export const Callout = Extension.create({ name: "callout", requires: ["blockquote"],
  /** @returns Viewport-only quote styling and source-revealing title delimiters. */
  addProjectionLayers: () => [{ key: "callout-rows", placement: "inline",
    /** @param input - Confirmed quote ranges and visible rows. @returns Semantic title and line roles, preserving canonical body text. */
    build(input) {
    const result: ProjectionDecoration[] = [];
    for (const match of input.query("blockquote").matches) {
      const header = input.document.lineAt(match.from);
      const quoteSource = input.document.slice(match.from, header.to);
      const directive = /^ {0,3}(?:>[ \t]?)+\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/u.exec(quoteSource);
      if (!directive) continue;
      const role = directive[1]!.toLowerCase();
      const marker = match.from + quoteSource.indexOf("[!");
      if (header.from >= input.from && header.from <= input.to) {
        result.push({ type: "mark", from: marker + 2, to: marker + 2 + directive[1]!.length, class: "msfe-callout-label" },
          { type: "replace", from: marker, to: marker + 2, key: `${marker}-open` },
          { type: "replace", from: marker + 2 + directive[1]!.length, to: marker + 3 + directive[1]!.length, key: `${marker}-close` });
      }
      let line = input.document.lineAt(Math.max(input.from, match.from));
      while (line.from <= input.to && line.from < match.to) {
        result.push({ type: "line", from: line.from, class: `msfe-callout msfe-callout-${role}${line.from === header.from ? " msfe-callout-title" : ""}` });
        if (line.to >= input.document.length) break;
        line = input.document.lineAt(line.to + 1);
      }
    }
    return result;
  } }],
});
