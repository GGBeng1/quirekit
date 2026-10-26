import { MarkdownRenderer as CoreRenderer } from "@quirekit/incremark-core";
import type { MarkdownCacheLimits, MarkdownRenderFrame, MarkdownRenderWork, MarkdownLocale, MarkdownReadingError } from "@quirekit/incremark-core";
import type { VNodeChild } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { MarkdownRenderOptions } from "../types";
import { vueAdapter } from "../rendering/adapter";

/** Vue-compatible cache owner; all reuse proofs and retention live in core. */
export class MarkdownRenderer extends CoreRenderer<VNodeChild> {
  /** @param limits - Optional non-negative retention budgets. */
  constructor(limits: MarkdownCacheLimits = {}) { super(vueAdapter, limits); }
  /** @returns Work counters from the accepted frame, excluding parsing and DOM painting. */
  override get work(): Readonly<MarkdownRenderWork> { return super.work; }
  /** Clears current-document output and invalidates prepared frames. */
  override clear(): void { super.clear(); }
  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Stable failure observer. @param options - Presentation policy. @returns Prepared Vue output, accepted only by commit. */
  override prepare(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions = {}): MarkdownRenderFrame<VNodeChild> { return super.prepare(state, locale, prefix, onError, options); }
  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Failure observer. @param options - Presentation policy. @returns Immediately committed Vue content with proven block reuse. */
  override render(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions = {}): VNodeChild { return super.render(state, locale, prefix, onError, options); }
}
