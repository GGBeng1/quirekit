import { syntaxTree } from "@quirekit/cm-language";
import { Decoration, EditorView, ViewPlugin, WidgetType, type ViewUpdate } from "@quirekit/cm-view";
import { Prec, type EditorState, type Range } from "@quirekit/cm-state";
import type { Tree, SyntaxNode } from "@lezer/common";
import { isSourceRevealed, readSourcePresentation, sourceRevealResolver } from "@quirekit/msfe-core";
import { typographyRuns } from "./runs";
import { punctuationEdits } from "./replacements";
import { quoteEdits } from "./quotes";
import type { TypographerOptions, TypographyEdit, TypographerWork } from "./types";

const counters = new WeakMap<Tree, TypographerWork>();
const blocks = /^(?:Paragraph|ATXHeading[1-6]|SetextHeading[12]|TableCell|DefinitionTerm)$/u;

/** Small literal text widget; source coordinates, selection and input remain native. */
class TypographyText extends WidgetType {
  /** @param text - Display punctuation, never HTML. */
  constructor(private readonly text: string) { super(); }
  /** @param other - Previous punctuation. @returns Whether its DOM can be retained. */
  eq(other: TypographyText): boolean { return this.text === other.text; }
  /** @param view - Native DOM owner. @returns A text-only inline replacement. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span"); span.className = "msfe-typography"; span.textContent = this.text; return span;
  }
  /** @returns Native pointer selection reveals canonical source. */
  ignoreEvent(): boolean { return false; }
}

/** @param options - Immutable extension configuration. @returns Viewport-only presentation with cached block matching and native source reveal. */
export function typographerProjection(options: TypographerOptions) {
  const cache = new WeakMap<Tree, Map<string, readonly TypographyEdit[]>>();
  /** @param state - Accepted source. @param node - Visible inline block. @returns Cached bounded replacements, never a whole-document text projection. */
  function edits(state: EditorState, node: SyntaxNode): readonly TypographyEdit[] {
    const tree = syntaxTree(state);
    let entries = cache.get(tree); if (!entries) cache.set(tree, entries = new Map());
    const key = `${node.from}:${node.to}:${node.name}`;
    const existing = entries.get(key); if (existing) return existing;
    const runs = node.to - node.from <= options.maxBlockLength ? typographyRuns(state, node) : [];
    const before = counters.get(tree) ?? { blocks: 0, textUnits: 0 };
    counters.set(tree, { blocks: before.blocks + 1, textUnits: before.textUnits + runs.reduce((sum, run) => sum + run.text.length, 0) });
    const result = [...(options.replacements ? runs.flatMap(punctuationEdits) : []), ...(options.smartQuotes ? quoteEdits(runs, options.quotes) : [])];
    entries.set(key, result); return result;
  }
  /** @param view - Mounted source owner. @returns Inactive visible punctuation only, using the core gesture snapshot. */
  function project(view: EditorView) {
    const presentation = readSourcePresentation(view.state);
    if (presentation.mode === "source") return Decoration.none;
    const ranges: Range<Decoration>[] = [], seen = new Set<string>();
    for (const visible of view.visibleRanges) syntaxTree(view.state).iterate({ ...visible, enter(reference) {
      if (!blocks.test(reference.name)) return;
      const active = isSourceRevealed(view.state, reference);
      if (!active) for (const edit of edits(view.state, reference.node)) {
        const key = `${edit.from}:${edit.to}`;
        if (edit.from < visible.from || edit.to > visible.to || seen.has(key)) continue;
        seen.add(key); ranges.push(Decoration.replace({ widget: new TypographyText(edit.text) }).range(edit.from, edit.to));
      }
      return false;
    } });
    return Decoration.set(ranges, true);
  }
  // Text replacements belong inside semantic marks, including quotes at a link's exact edges.
  return Prec.high(ViewPlugin.define(view => ({ decorations: project(view),
    /** @param update - Accepted source, mode, gesture selection or viewport change. */
    update(update: ViewUpdate) {
      const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)
        || before.mode !== after.mode || before.reveal !== after.reveal || !before.selection.eq(after.selection)
        || update.startState.facet(sourceRevealResolver) !== update.state.facet(sourceRevealResolver)) this.decorations = project(update.view);
    },
  }), { decorations: value => value.decorations,
    provide: plugin => EditorView.atomicRanges.of(view => readSourcePresentation(view.state).reveal === "hidden"
      ? view.plugin(plugin)?.decorations ?? Decoration.none : Decoration.none),
  }));
}

/** @param state - Accepted source snapshot. @returns Actual matching work, without triggering a computation. */
export function getTypographerWork(state: EditorState): TypographerWork { return { ...(counters.get(syntaxTree(state)) ?? { blocks: 0, textUnits: 0 }) }; }
