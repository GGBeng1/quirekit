import { Decoration } from "@quirekit/cm-view";
import { RangeSet, RangeValue, type EditorState, type Range } from "@quirekit/cm-state";
import type { MsfeEditor } from "../../editor/types";
import type { MsfeComponentHost, MsfeSourceRange } from "../../views/types";
import { ComponentWidget } from "../../views/component/widget";
import { compositionField } from "../../state/fields";
import { isSourceActive, isSourceRevealed } from "../activation";
import { sourceRevealSelection } from "../gesture";
import type { LayerCache, LayerOutput, ProjectionLayer } from "./types";
import { ProjectionText } from "./text";
import { sourceRevealSetting } from "../visibility";

/** Immutable interval marker for already admitted replacement owners. */
class ReplacementRange extends RangeValue {}
const replacementRange = new ReplacementRange();

/** @param layers - Ordered descriptions; earlier structural owners win replacement conflicts.
 * @param state - Canonical state. @param editor - Lazy editor API. @param host - Framework host.
 * @param structural - Already admitted block replacements. @returns Sorted backend output and conflict count. */
export function layerDecorations(layers: readonly { layer: ProjectionLayer; cache: LayerCache }[], state: EditorState,
  editor: () => MsfeEditor, host: MsfeComponentHost | undefined, structural: readonly MsfeSourceRange[] = []): LayerOutput {
  const ranges: Range<Decoration>[] = [], atomic: Range<Decoration>[] = [], objects: Range<Decoration>[] = [];
  const hidden = sourceRevealSetting.read(state) === "hidden";
  const composing = !hidden && state.field(compositionField, false);
  const selection = sourceRevealSelection(state);
  const replacements = [...structural];
  let occupied = RangeSet.of(structural.map(range => replacementRange.range(range.from, range.to)), true);
  let conflicts = 0;
  const keys = new Map<string, MsfeSourceRange>();
  for (const { layer, cache } of layers) for (const item of cache.descriptions) {
    const end = "to" in item ? item.to : item.from;
    if (!Number.isInteger(item.from) || !Number.isInteger(end) || item.from < 0 || end < item.from || end > state.doc.length) throw new RangeError(`invalid-projection-range: ${layer.key}`);
    // Keep cached descriptions and remote component identities. Only output
    // intersecting IME's source selection may fall back during materialization.
    const owner = item.type === "replace" && item.revealRange ? item.revealRange
      : { from: item.from, to: item.type === "line" ? state.doc.lineAt(item.from).to : end };
    const suppressed = composing && layer.suppressDuringComposition !== false && isSourceActive(selection, owner.from, owner.to);
    const structuralLayer = layer.placement === "block";
    const block = item.type === "replace" ? item.block ?? structuralLayer : structuralLayer;
    if (item.type === "mark") { if (!suppressed && end > item.from) ranges.push(Decoration.mark({ class: item.class }).range(item.from, end)); continue; }
    if (item.type === "line") {
      if (state.doc.lineAt(item.from).from !== item.from) throw new Error(`projection-line-boundary: ${layer.key}`);
      if (!suppressed) ranges.push(Decoration.line({ class: item.class }).range(item.from)); continue;
    }
    const key = `${layer.key}/${cache.identities?.get(item) ?? item.key}`;
    const previous = keys.get(key);
    if (previous) {
      if (previous.from === item.from && previous.to === end) continue;
      throw new Error(`duplicate-projection-widget: ${key}`);
    }
    keys.set(key, { from: item.from, to: end });
    if (item.type === "replace") {
      if (item.from === end) continue;
      if (!structuralLayer && (block || state.doc.lineAt(item.from).number !== state.doc.lineAt(end).number)) throw new Error(`block-projection-required: ${key}`);
      const reveal = item.revealRange ?? { from: item.from, to: end };
      if (!Number.isInteger(reveal.from) || !Number.isInteger(reveal.to) || reveal.from < 0 || reveal.from > item.from || reveal.to < end || reveal.to > state.doc.length) throw new RangeError(`invalid-projection-reveal-range: ${key}`);
      if (item.view && item.text !== undefined) throw new Error(`ambiguous-projection-content: ${key}`);
      if (suppressed) continue;
      if (item.interaction !== "atomic" && isSourceRevealed(state, reveal)) continue;
      // Normalized code can contribute many small fragments. Query an interval index
      // instead of rescanning all prior fragments on each selection materialization.
      let overlap = false;
      occupied.between(item.from, end, (from, to) => { if (from < end && to > item.from) { overlap = true; return false; } });
      if (overlap) { conflicts++; continue; }
      occupied = occupied.update({ add: [replacementRange.range(item.from, end)] });
      replacements.push({ from: item.from, to: end });
    }
    if (suppressed) continue;
    const widget = item.view ? new ComponentWidget(key, item.view, block, editor, host, item.type === "replace")
      : item.type === "replace" && item.text !== undefined ? new ProjectionText(item.text) : undefined;
    const decoration = item.type === "replace" ? Decoration.replace({ ...(widget ? { widget } : {}), block }).range(item.from, end)
      : Decoration.widget({ widget: widget!, block, side: item.side ?? -1 }).range(item.from);
    ranges.push(decoration);
    if (item.type === "replace" && (hidden || item.interaction === "atomic")) atomic.push(decoration);
    if (item.type === "replace" && item.view && block) objects.push(decoration);
  }
  return { decorations: Decoration.set(ranges, true), atomic: Decoration.set(atomic, true), objects: Decoration.set(objects, true), replacements, conflicts };
}
