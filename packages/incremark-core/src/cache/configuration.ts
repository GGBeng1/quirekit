import type { EditorState } from "@quirekit/cm-state";
import type { MarkdownLocale, MarkdownReadingError } from "../types";
import type { MarkdownRenderOptions } from "../reading/types";
import { markdownMermaidEnabled, markdownTextDiagramsEnabled } from "../parse/capabilities";
import { readingContributions } from "../contributions/registry";
import type { MarkdownRenderWork } from "./types";

/** @returns Detached zero counters for a new projection or explicit clear. */
export function emptyWork(): MarkdownRenderWork {
  return { visitedBlocks: 0, reusedBlocks: 0, projectedNodes: 0, dependencyNodes: 0, semanticChecks: 0, cachedBlocks: 0, cachedSourceUnits: 0 };
}

/** @param state - Accepted source. @param locale - Control language. @param prefix - Footnote/HTML namespace.
 * @param report - Failure observer identity. @param options - Current reactive configuration.
 * @returns A detached configuration signature; copied values also observe in-place reactive map/policy updates. */
export function configuration<Output>(state: EditorState, locale: MarkdownLocale, prefix: string,
  report: (error: MarkdownReadingError) => void, options: MarkdownRenderOptions<Output>): readonly unknown[] {
  const policy = options.html;
  return [locale, prefix, report, state.facet(readingContributions), state.facet(markdownMermaidEnabled), state.facet(markdownTextDiagramsEnabled), options.renderNode, options.renderNodeKey,
    typeof policy === "object" ? true : policy, typeof policy === "object" ? policy.allowLink : undefined,
    typeof policy === "object" ? policy.allowImage : undefined,
    typeof policy === "object" ? policy.styles : undefined,
    typeof policy === "object" ? JSON.stringify(policy.allowedElements) : undefined,
    ...Object.entries(options.components ?? {}).sort(([a], [b]) => a.localeCompare(b)).flat()];
}

/** @param before - Captured values. @param after - Current values. @returns Whether the configuration is identical under Object.is. */
export function sameConfiguration(before: readonly unknown[], after: readonly unknown[]): boolean {
  return before.length === after.length && before.every((value, index) => Object.is(value, after[index]));
}
