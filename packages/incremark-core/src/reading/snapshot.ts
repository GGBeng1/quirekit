import type { EditorState } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { markdownMermaidEnabled, markdownTextDiagramsEnabled } from "../parse/capabilities";
import { readingContributions } from "../contributions/registry";

/** @param previous - Last consumed snapshot. @param next - New editor state. @returns Whether all static reading inputs are unchanged, including parser progress and installed owners. */
export function sameReadingSnapshot(previous: EditorState, next: EditorState): boolean {
  return previous.doc === next.doc && syntaxTree(previous) === syntaxTree(next)
    && previous.facet(readingContributions) === next.facet(readingContributions)
    && previous.facet(markdownMermaidEnabled) === next.facet(markdownMermaidEnabled)
    && previous.facet(markdownTextDiagramsEnabled) === next.facet(markdownTextDiagramsEnabled);
}
