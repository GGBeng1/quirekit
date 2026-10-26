import { Decoration } from "@quirekit/cm-view";
import { componentView, type MsfeEditor, type ProjectionContext, type ProjectionLayer, type StateSlot } from "@quirekit/msfe-core";
import { nativeContainerControl } from "./controls";
import { insideContainer } from "./query";
import { setContainerExpanded } from "./state";
import type { ContainerOptions, ContainerState } from "./types";

/** @param input - Viewport-local confirmed composite. @returns Existing Callout line roles and exact header source hiding. */
export function projectContainer({ state, node, active, from, to }: ProjectionContext) {
  const marks = node.getChildren("ContainerMark"), name = node.getChild("ContainerName"), title = node.getChild("ContainerTitle");
  if (marks.length !== 2 || !name) return [];
  const type = state.sliceDoc(name.from, name.to), role = type === "info" ? "note" : type === "danger" ? "caution" : type;
  const result = [], first = state.doc.lineAt(node.from).from, last = state.doc.lineAt(marks[1]!.from).from;
  let line = state.doc.lineAt(Math.max(from, node.from));
  while (line.from <= to && line.from <= last) {
    result.push(Decoration.line({ class: `msfe-quote-line msfe-callout msfe-container msfe-callout-${role}${line.from === first ? " msfe-callout-title" : ""}${line.from === last ? " msfe-container-end" : ""}${line.from === last && !active ? " msfe-container-end-hidden" : ""}${active ? " msfe-container-active" : ""}` }).range(line.from));
    if (line.to >= state.doc.length) break;
    line = state.doc.lineAt(line.to + 1);
  }
  // Native title text remains selectable. Only confirmed syntax is hidden, clipped to each visible interval.
  if (!active) for (const [start, end] of [[marks[0]!.from, title?.from ?? name.from], [marks[1]!.from, marks[1]!.to]]) {
    const left = Math.max(start!, from), right = Math.min(end!, to);
    if (left < right) result.push(Decoration.replace({}).range(left, right));
  }
  return result;
}

/** @param slot - Document-local view state. @param options - Host presentation. @param editor - Late canonical owner. @returns Direct body folding and viewport-only controls. */
export function containerLayers(slot: StateSlot<ContainerState>, options: ContainerOptions, editor: () => MsfeEditor): readonly ProjectionLayer[] {
  return [{ key: "container-folds", placement: "block", states: [slot],
    /** @param input - Declared state dependency. @returns Outermost replacements before CM calculates its viewport. */
    build(input) {
      const result = [];
      for (let cursor = input.getState(slot).hidden.iter(); cursor.value; cursor.next()) result.push({ type: "replace" as const,
        key: `body-${cursor.value.entry.from}`, from: cursor.from, to: cursor.to, block: false, interaction: "atomic" as const });
      return result;
    },
  }, { key: "container-controls", placement: "inline", states: [slot],
    /** @param input - Visible source and retained disclosure state. @returns Controls for visible headings; hidden descendant controls never mount. */
    build(input) {
      const state = input.getState(slot);
      return input.query("customContainer").matches.flatMap(match => {
        if (match.attrs.name !== "details" || match.from < input.from || match.from > input.to || insideContainer(state.hidden, match.from)) return [];
        const expanded = state.expanded.get(match.from) ?? options.detailsOpen;
        return [{ type: "widget" as const, key: `toggle-${match.from}`, from: match.from,
          view: componentView(options.controls ?? nativeContainerControl, { expanded,
            label: options.toggleLabel(expanded, String(match.attrs.title || match.attrs.name)),
            toggle: () => setContainerExpanded(editor(), slot, state, match.from, !expanded) }) }];
      });
    },
  }];
}
