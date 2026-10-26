import createDOMPurify, { type DOMPurify, type WindowLike } from "dompurify";
import { syntaxTree } from "@quirekit/cm-language";
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from "@quirekit/cm-view";
import type { Extension, Range } from "@quirekit/cm-state";
import { isSourceRevealed, readSourcePresentation, sourceRevealResolver } from "@quirekit/msfe-core";
import { htmlCandidates } from "../parse/candidates";
import { parseHtmlFragments } from "../parse/fragments";
import { renderingSetting } from "../setting";
import { prepareHtml } from "./sanitize";
import { htmlDecorations } from "./decorations";
import type { PreparedHtml } from "./types";
import type { HtmlOptions, HtmlWork } from "../types";

/** Mounted counters are isolated from speculative state and are released with the view. */
export const htmlWork = new WeakMap<EditorView, HtmlWork>();

/** @param options - Fixed host policy. @returns Mounted, viewport-local HTML presentation. */
export function htmlProjection(options: HtmlOptions): Extension {
  return ViewPlugin.fromClass(class {
    decorations = Decoration.none;
    atomic = Decoration.none;
    private readonly purifier: DOMPurify;
    private readonly cache = new Map<string, readonly PreparedHtml[]>();
    private readonly work: HtmlWork = { projects: 0, parses: 0, sanitizations: 0, cacheHits: 0, fallbacks: 0 };
    /** @param view - Single CM input owner. */
    constructor(private readonly view: EditorView) {
      this.purifier = createDOMPurify(view.dom.ownerDocument.defaultView as WindowLike);
      htmlWork.set(view, this.work); this.project();
    }
    /** Reuses source-keyed plans when only the selection, mode or absolute offsets changed. */
    private project(): void {
      this.work.projects++;
      const presentation = readSourcePresentation(this.view.state);
      if (renderingSetting.read(this.view.state) !== "safe" || presentation.mode === "source") {
        this.decorations = this.atomic = Decoration.none; return;
      }
      const ranges: Range<Decoration>[] = [];
      for (const candidate of htmlCandidates(this.view)) {
        const key = `${candidate.tags ? [...candidate.tags].join(",") : "block"}:${candidate.source}`;
        let plans = this.cache.get(key);
        if (plans) this.work.cacheHits++;
        else {
          this.work.parses++;
          const fragments = parseHtmlFragments(candidate.source, candidate.tags);
          plans = fragments.flatMap(fragment => {
            const plan = prepareHtml(this.purifier, candidate.source, fragment, options, this.work);
            if (!plan) this.work.fallbacks++;
            return plan ? [plan] : [];
          });
          if (!fragments.length) this.work.fallbacks++;
          // Bound retained input as well as single-parser work; old document text is never an unbounded cache.
          if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value!);
          this.cache.set(key, plans);
        }
        for (const plan of plans) {
          if (isSourceRevealed(this.view.state, {
            from: candidate.from + plan.fragment.from, to: candidate.from + plan.fragment.to })) continue;
          ranges.push(...htmlDecorations(this.view, plan, candidate.from));
        }
      }
      this.decorations = Decoration.set(ranges, true);
      this.atomic = presentation.reveal === "hidden"
        ? Decoration.set(ranges.filter(range => range.to > range.from && range.value.point), true) : Decoration.none;
    }
    /** @param update - Accepted state or viewport change. */
    update(update: ViewUpdate): void {
      const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)
        || before.mode !== after.mode || before.reveal !== after.reveal || !before.selection.eq(after.selection)
        || update.startState.facet(sourceRevealResolver) !== update.state.facet(sourceRevealResolver)
        || renderingSetting.read(update.startState) !== renderingSetting.read(update.state)) this.project();
    }
    /** Releases all cached source and sanitizer hooks on document replacement or editor teardown. */
    destroy(): void { this.cache.clear(); this.purifier.removeAllHooks(); htmlWork.delete(this.view); }
  }, { decorations: value => value.decorations,
    provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.atomic ?? Decoration.none),
  });
}
