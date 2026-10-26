import type { NodeViewRuntime } from "../views/runtime";
import { syntaxTree } from "@quirekit/cm-language";
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from "@quirekit/cm-view";
import type { Extension, Range } from "@quirekit/cm-state";
import type { CompiledExtensions } from "../extensions/types";
import { modeFacet } from "../state/fields";
import type { MsfeWorkCounters } from "./types";
import { sourceRevealSelection } from "./gesture";
import { sourceRevealSetting } from "./visibility";
import { isSourceRevealed, sourceRevealResolver } from "./activation";

/**
 * Derives only viewport-local inline decorations from the canonical parser tree.
 * @param view - Owner of visible source ranges and state.
 * @param compiled - Validated syntax owners.
 * @param counters - Instance-local work instrumentation.
 * @param nodeViews - Source-bound component identity owner.
 * @returns Sorted decorations; unsupported or partially parsed text stays visible.
 */
function project(view: EditorView, compiled: CompiledExtensions, counters: MsfeWorkCounters, nodeViews: NodeViewRuntime) {
  nodeViews.begin();
  counters.projections++;
  counters.decorations = 0;
  const mode = view.state.facet(modeFacet);
  const selection = sourceRevealSelection(view.state);
  const hidden = sourceRevealSetting.read(view.state) === "hidden";
  // IME owns the active source, not every projected node in the document.
  // Existing selection-based reveal already leaves that text editable while
  // unrelated marks, table grids and component lifetimes remain installed.
  if (mode === "source") { nodeViews.end(); return { decorations: Decoration.none, outer: Decoration.none, atomic: Decoration.none }; }
  const ranges: Range<Decoration>[] = [], outer: Range<Decoration>[] = [];
  const seen = new Set<string>();
  const tree = syntaxTree(view.state);
  // The view bounds traversal; container features also clamp their per-line work to this interval.
  for (const visible of view.visibleRanges) tree.iterate({
    ...visible,
    enter: reference => {
      counters.visitedNodes++;
      const owner = compiled.projections.get(reference.name);
      const component = compiled.nodeViews.get(reference.name);
      if (!owner && !component) return;
      const key = `${reference.from}:${reference.to}:${reference.name}:${visible.from}`;
      if (seen.has(key)) return;
      seen.add(key);
      const context = {
        state: view.state, node: reference.node, mode, selection,
        active: isSourceRevealed(view.state, reference),
        from: visible.from, to: visible.to,
      };
      if (owner) (owner.outer ? outer : ranges).push(...owner.decorate(context));
      if (component) ranges.push(...nodeViews.decorate(view, component, context));
    },
  });
  nodeViews.end();
  counters.decorations = ranges.length + outer.length;
  return { decorations: Decoration.set(ranges, true), outer: Decoration.set(outer, true),
    // Recognized hidden tokens remain source-owned, but native arrows and deletion
    // must not stop midway through an invisible delimiter or replaced widget.
    atomic: hidden ? Decoration.set([...ranges, ...outer].filter(range => range.to > range.from && range.value.point), true) : Decoration.none };
}

/**
 * Installs one projection owner for all feature plugins.
 * @param compiled - Validated feature configuration.
 * @param counters - Instance-local work counters.
 * @param nodeViews - Source-bound component identity owner.
 * @returns CodeMirror plugin without a second input or document model.
 */
export function liveProjection(compiled: CompiledExtensions, counters: MsfeWorkCounters, nodeViews: NodeViewRuntime): Extension {
  return ViewPlugin.define(view => ({
    ...project(view, compiled, counters, nodeViews),
    /**
     * Reprojects only when a declared dependency changes; parsing remains CodeMirror-owned.
     * @param update - Accepted view update.
     */
    update(update: ViewUpdate) {
      nodeViews.map(update);
      if (update.startState.readOnly !== update.state.readOnly || update.docChanged || update.viewportChanged
        || sourceRevealSetting.read(update.state) !== "hidden" && !sourceRevealSelection(update.startState).eq(sourceRevealSelection(update.state))
        || syntaxTree(update.startState) !== syntaxTree(update.state)
        || update.startState.facet(modeFacet) !== update.state.facet(modeFacet)
        || update.startState.facet(sourceRevealResolver) !== update.state.facet(sourceRevealResolver)
        || sourceRevealSetting.read(update.startState) !== sourceRevealSetting.read(update.state)) {
        Object.assign(this, project(update.view, compiled, counters, nodeViews));
      }
    },
  }), { decorations: plugin => plugin.decorations,
    provide: plugin => [EditorView.outerDecorations.of(view => view.plugin(plugin)?.outer ?? Decoration.none),
      EditorView.atomicRanges.of(view => view.plugin(plugin)?.atomic ?? Decoration.none)],
  });
}
