import { syntaxTree } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownLocale, MarkdownReadingError } from "../types";
import { renderHtmlBlock } from "../html/render";
import { renderInline } from "./inline";
import { renderBlock } from "./blocks";
import type { MarkdownAdapter, MarkdownRenderOptions, ReadingContext, ReadingProjection } from "./types";
import { readingContributions } from "../contributions/registry";
import type { ReadingContribution } from "../contributions/types";
import { renderContribution } from "../contributions/project";

/** @param adapter - Output-family factory. @param state - Accepted source. @param locale - Control language.
 * @param prefix - Instance navigation namespace. @param onError - Isolated failure observer.
 * @param options - Presentation policy. @param projection - Optional block retention and instrumentation.
 * @returns Disposable framework output with source fallback for unknown or unparsed syntax. */
export function projectMarkdown<Output>(adapter: MarkdownAdapter<Output>, state: EditorState, locale: MarkdownLocale, prefix: string,
  onError: (error: MarkdownReadingError) => void, options: MarkdownRenderOptions<Output>, projection?: ReadingProjection<Output>): Output {
  const contributions = state.facet(readingContributions).get(adapter.reading.key) ?? new Map();
  const context: ReadingContext<Output> = { state, locale, prefix, render, options, adapter, report,
    element: (node, tag, attributes, children) => adapter.element(options.components, node, tag, attributes, children, locale),
    contributions: contributions as ReadonlyMap<string, readonly ReadingContribution<Output>[]>,
  };
  /** @param failure - Consumer failure; observers cannot break source fallback. */
  function report(failure: MarkdownReadingError): void { try { onError(failure); } catch (error) { console.error(error); } }
  /** @param node - Accepted syntax. @returns Output using optional top-level retention. */
  function render(node: SyntaxNode): Output {
    return projection && node.parent?.name === "Document" ? projection.block(context, node, () => project(node)) : project(node);
  }
  /** @param node - Syntax requiring fresh projection. @returns Semantic presentation or exact source fallback. */
  function project(node: SyntaxNode): Output {
    projection?.projected();
    const contribution = renderContribution(context, node);
    if (contribution !== undefined) return contribution;
    if (options.renderNode) {
      try { const output = options.renderNode(context, node); if (output !== undefined) return output; }
      catch (cause) { report({ owner: "node-renderer", phase: "render", from: node.from, to: node.to, cause }); return adapter.text(state.sliceDoc(node.from, node.to)); }
    }
    if (node.name === "HTMLBlock" && options.html) return renderHtmlBlock(context, node);
    const inline = renderInline(context, node);
    if (inline !== undefined) return inline;
    const block = renderBlock(context, node);
    if (block !== undefined) return block;
    return adapter.fallback(state.sliceDoc(node.from, node.to));
  }
  const tree = syntaxTree(state);
  return adapter.fragment([render(tree.topNode), tree.length < state.doc.length ? adapter.fallback(state.sliceDoc(tree.length), true) : adapter.fragment([])]);
}

/** @param adapter - Output-family factory. @param state - Accepted source. @param locale - Control language.
 * @param prefix - Instance namespace. @param onError - Failure observer. @param options - Presentation policy.
 * @returns Complete ordinary projection, without retained output. */
export function renderMarkdown<Output>(adapter: MarkdownAdapter<Output>, state: EditorState, locale: MarkdownLocale, prefix = "md-note",
  onError: (error: MarkdownReadingError) => void = console.error, options: MarkdownRenderOptions<Output> = {}): Output {
  return projectMarkdown(adapter, state, locale, prefix, onError, options);
}
