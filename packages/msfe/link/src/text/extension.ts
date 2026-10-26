import { RangeSetBuilder, StateEffect } from "@quirekit/cm-state";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { applyViewStateUpdate, isSafeDestination, readSourcePresentation, type MsfeExtension } from "@quirekit/msfe-core";
import type { TextLinkOptions } from "../types";
import { globalPattern, scanTextLinks } from "./scan";
import { cachedCardLoader, textLinkCardSources, type TextLinkCardSource } from "./card";
import { textLinkRules } from "./rules";

const verifyDelay = 250;
/** Verification results per host rule, shared by every editor using the same options object. */
const caches = new WeakMap<TextLinkOptions, Map<string, boolean>>();
/** Card loaders per host rule, shared like verification results. */
const cardLoaders = new WeakMap<TextLinkOptions, TextLinkCardSource["load"]>();

/**
 * Presents matching plain text as links without changing the Markdown source.
 * Clicking follows the link extension's policy, so `link` must be installed.
 * @param options - Host matcher, destination and optional existence check.
 * @returns Installable extension.
 */
export function textLinks(options: TextLinkOptions): MsfeExtension {
  const pattern = globalPattern(options.pattern);
  let cache = caches.get(options);
  if (!cache) caches.set(options, cache = new Map());
  const known = cache;
  const verified = StateEffect.define<null>();

  const plugin = ViewPlugin.fromClass(class {
    /** Current link marks over the visible ranges. */ decorations: DecorationSet;
    /** Candidates waiting for the next batched check. */ private readonly pending = new Set<string>();
    /** Batch timer. */ private timer: ReturnType<typeof setTimeout> | undefined;
    /** In-flight batches, aborted only when the view is destroyed. */ private readonly controllers = new Set<AbortController>();
    /** Set once the view is gone, so late results never dispatch. */ private destroyed = false;
    /** An unknown candidate at the caret was skipped; the next selection change rebuilds. */ private deferred = false;

    /** @param view - Mounted editor. */
    constructor(private readonly view: EditorView) {
      this.decorations = this.build();
    }

    /** @param update - Accepted view update. */
    update(update: ViewUpdate): void {
      const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
      // Rebuilding marks under an active IME composition would disturb it; map until it ends.
      if (after.composing) { this.decorations = this.decorations.map(update.changes); return; }
      if (update.docChanged || update.viewportChanged || before.mode !== after.mode || before.composing
        || (this.deferred && update.selectionSet) || update.focusChanged
        || syntaxTree(update.startState) !== syntaxTree(update.state)
        || update.transactions.some(transaction => transaction.effects.some(effect => effect.is(verified)))) {
        this.decorations = this.build();
      }
    }

    /** @returns Link marks for verified candidates in the visible ranges; unknown ones are queued. */
    build(): DecorationSet {
      const { state } = this.view, builder = new RangeSetBuilder<Decoration>();
      if (readSourcePresentation(state).mode === "source") return builder.finish();
      const tree = syntaxTree(state);
      // An unknown candidate ending at the focused caret is still being typed; checking each prefix would waste requests.
      const carets = this.view.hasFocus ? new Set(state.selection.ranges.map(range => range.head)) : new Set<number>();
      this.deferred = false;
      for (const range of this.view.visibleRanges) {
        for (const match of scanTextLinks(state.sliceDoc(range.from, range.to), range.from, pattern, tree)) {
          const exists = options.verify ? known.get(match.text) : true;
          if (exists === undefined) {
            if (carets.has(match.to)) this.deferred = true;
            else this.queue(match.text);
            continue;
          }
          const url = exists ? options.href(match.text) : null;
          if (!url || !isSafeDestination(url)) continue;
          builder.add(match.from, match.to, Decoration.mark({ tagName: "a", class: "msfe-link msfe-text-link", attributes: {
            href: url, "data-msfe-url": url, "data-msfe-text-link": options.id, rel: "noopener noreferrer", tabindex: "-1",
          } }));
        }
      }
      return builder.finish();
    }

    /** @param text - Unverified candidate, merged into the next batch. */
    private queue(text: string): void {
      this.pending.add(text);
      this.timer ??= setTimeout(() => void this.flush(), verifyDelay);
    }

    /** Verifies one batch; a failed or aborted batch is not cached and is retried by a later build. */
    private async flush(): Promise<void> {
      this.timer = undefined;
      const texts = [...this.pending];
      this.pending.clear();
      const controller = new AbortController();
      this.controllers.add(controller);
      try {
        const found = new Set(await options.verify!(texts, controller.signal));
        if (controller.signal.aborted || this.destroyed) return;
        for (const text of texts) known.set(text, found.has(text));
        // Rejected during composition; the next view update rebuilds from the filled cache.
        applyViewStateUpdate(this.view, { effects: [verified.of(null)] });
      } catch { /* Left unknown; the next rebuild queues these candidates again. */ }
      finally { this.controllers.delete(controller); }
    }

    /** Stops pending and in-flight checks. */
    destroy(): void {
      this.destroyed = true;
      clearTimeout(this.timer);
      for (const controller of this.controllers) controller.abort();
    }
  }, { decorations: value => value.decorations });

  let card = cardLoaders.get(options);
  if (options.card && !card) cardLoaders.set(options, card = cachedCardLoader(options.card));
  const rule = textLinkRules.of({ options, pattern, known });
  return { id: options.id, requires: ["link"], extensions: card
    ? [plugin, rule, textLinkCardSources.of({ id: options.id, load: card, ...(options.fromHref ? { fromHref: options.fromHref } : {}) })]
    : [plugin, rule] };
}
