import { componentView, type MsfeEditor, type ProjectionLayer } from "@quirekit/msfe-core";
import type { CodeBlockOptions } from "../types";
import { emptyCodeLine } from "./source";
import { emptyCodeRenderer } from "./view";

/** @param name - Installed source owner. @param options - Placeholder preferences. @param editor - Lazy canonical owner. @returns Incremental structural input space, absent when disabled. */
export function emptyCodeLayer(name: string, options: CodeBlockOptions, editor: () => MsfeEditor): readonly ProjectionLayer[] {
  if (!options.emptyLine) return [];
  return [{ key: `${name}-empty-line`, placement: "block", incremental: true,
    /** @param input - Changed complete code blocks. @returns Only code blocks lacking a real body row. */
    build(input) {
      return input.query(name).matches.flatMap(match => {
        const empty = emptyCodeLine(input.document, match.node);
        if (!empty) return [];
        return [{ type: "widget" as const, from: empty.line.from, key: `empty-${match.from}`, side: -1 as const,
          view: componentView(emptyCodeRenderer, { from: match.from, readOnly: input.readOnly, label: options.emptyLineLabel, editor },
            (props, offset) => ({ ...props, from: props.from + offset })) }];
      });
    },
  }];
}
