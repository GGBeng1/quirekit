import type { ReactNode } from "react";
import type { EditorState } from "@quirekit/cm-state";
import { MarkdownRenderer as CoreRenderer, renderMarkdown as renderCore } from "@quirekit/incremark-core";
import type { MarkdownCacheLimits, MarkdownLocale, MarkdownReadingError, MarkdownRenderFrame, MarkdownRenderWork } from "@quirekit/incremark-core";
import type { MarkdownRenderOptions } from "../types";
import { reactAdapter } from "./adapter";

/** React cache owner; prepare is safe during render and commit accepts only the current attempt. */
export class MarkdownRenderer extends CoreRenderer<ReactNode> {
  /** @param limits - Optional non-negative retention budgets. */
  constructor(limits: MarkdownCacheLimits = {}) { super(reactAdapter, limits); }
  /** @returns Work counters from the committed frame, excluding parsing and DOM painting. */
  override get work(): Readonly<MarkdownRenderWork> { return super.work; }
  /** Releases current-document output and rejects previously prepared frames. */
  override clear(): void { super.clear(); }
  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Stable failure observer. @param options - Presentation policy. @returns Speculative React content; commit only after acceptance. */
  override prepare(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions = {}): MarkdownRenderFrame<ReactNode> { return super.prepare(state, locale, prefix, onError, options); }
  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Failure observer. @param options - Presentation policy. @returns Immediately committed React output for synchronous hosts. */
  override render(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions = {}): ReactNode { return super.render(state, locale, prefix, onError, options); }
}

/** @param state - Accepted source. @param locale - Control language. @param prefix - Instance navigation namespace.
 * @param onError - Isolated failure observer. @param options - Presentation policy.
 * @returns Ordinary React projection with no retained block output. */
export function renderMarkdown(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
  options: MarkdownRenderOptions = {}): ReactNode { return renderCore(reactAdapter, state, locale, prefix, onError, options); }
