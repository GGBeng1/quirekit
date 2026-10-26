import { EditorSelection, MapMode, RangeSet, StateEffect, StateField, type EditorState } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation, type MsfeEditor, type StateSlot } from "@quirekit/msfe-core";
import { collectContainers, ContainerRange, inheritContainerIndexWork } from "./query";
import type { ContainerState, ContainerIndex } from "./types";

/** View-only intent in canonical source coordinates; it never enters text history. */
export const disclosureEffect = StateEffect.define<{ from: number; expanded: boolean }>({
  /** @param value - Requested choice. @param changes - Source mapping. @returns Mapped surviving target. */
  map(value, changes) { const from = changes.mapPos(value.from, 1, MapMode.TrackAfter); return from === null ? undefined : { ...value, from }; },
});

/** @param index - Current confirmed intervals. @param expanded - Instance choices. @param initial - Default visibility. @returns Outermost hidden bodies only. */
function hiddenContainers(index: ContainerIndex, expanded: ReadonlyMap<number, boolean>, initial: boolean): RangeSet<ContainerRange> {
  let end = -1;
  return RangeSet.of(index.entries.flatMap(entry => {
    if (entry.from < end || (expanded.get(entry.from) ?? initial)) return [];
    end = entry.to; return [new ContainerRange(entry).range(entry.headerEnd, entry.to)];
  }), true);
}

/** @param state - Current state. @param index - Confirmed intervals. @param choices - Mapped prior choices. @returns Choices after exposing hidden selection endpoints. */
function revealEndpoints(state: EditorState, index: ContainerIndex, choices: ReadonlyMap<number, boolean>): ReadonlyMap<number, boolean> {
  const presentation = readSourcePresentation(state);
  if (presentation.mode === "source" || presentation.selecting) return choices;
  let result = choices;
  for (const range of presentation.selection.ranges) for (const position of [range.anchor, range.head]) {
    index.ranges.between(position, position, (from, to, value) => {
      if (position <= from || position >= to || result.get(value.entry.from) === true) return;
      if (result === choices) result = new Map(choices);
      (result as Map<number, boolean>).set(value.entry.from, true);
    });
  }
  return result;
}

/** @param initial - Host default. @returns Document-local slot with indexed selection work and mapped UI state. */
export function containerState(initial: boolean): StateSlot<ContainerState> {
  const field = StateField.define<ContainerState>({
    /** @param state - New canonical document. @returns Fresh disclosure state; documents never share it. */
    create(state) {
      const index = collectContainers(state), expanded = revealEndpoints(state, index, new Map());
      return { index, expanded, hidden: hiddenContainers(index, expanded, initial) };
    },
    /** @param value - Previous disclosure state. @param transaction - Accepted source/view transaction. @returns Retained state unless a declared dependency changed. */
    update(value, transaction) {
      const state = transaction.state;
      inheritContainerIndexWork(transaction.startState, state);
      const index = state.doc === value.index.doc && syntaxTree(state) === value.index.tree
        ? value.index : collectContainers(state, value.index, transaction);
      let choices = value.expanded;
      // Remap only actual choices. A deleted or retyped owner must not donate its state to a new block.
      if (index !== value.index) {
        const valid = new Set(index.entries.map(entry => entry.from)), mapped = new Map<number, boolean>();
        for (const [position, expanded] of choices) {
          const from = transaction.changes.mapPos(position, 1, MapMode.TrackAfter);
          if (from !== null && (!index.ready || valid.has(from))) mapped.set(from, expanded);
        }
        choices = mapped;
      }
      for (const effect of transaction.effects) if (effect.is(disclosureEffect) && index.entries.some(entry => entry.from === effect.value.from)) {
        choices = new Map(choices).set(effect.value.from, effect.value.expanded);
      }
      const expanded = revealEndpoints(state, index, choices);
      return index === value.index && expanded === value.expanded ? value : { index, expanded, hidden: hiddenContainers(index, expanded, initial) };
    },
  });
  return { key: "container-disclosure", extension: field, read: state => state.field(field) };
}

/** @param editor - Mounted canonical owner. @param slot - Installed disclosure slot. @param expected - State that produced the control. @param from - Current container start. @param expanded - Requested visibility. */
export function setContainerExpanded(editor: MsfeEditor, slot: StateSlot<ContainerState>, expected: ContainerState, from: number, expanded: boolean): void {
  // Reject retired props even when a replacement document reuses the same id and source offsets.
  if (editor.scope.disposed || slot.read(editor.state) !== expected) return;
  const entry = slot.read(editor.state).index.entries.find(item => item.from === from);
  if (!entry) return;
  const presentation = readSourcePresentation(editor.state);
  if (presentation.composing || presentation.mode === "source") return;
  const move = !expanded && editor.state.selection.ranges.some(range => [range.anchor, range.head].some(position => position > entry.headerEnd && position < entry.to));
  editor.updateViewState({ effects: [disclosureEffect.of({ from, expanded })],
    ...(move ? { selection: EditorSelection.single(entry.headerEnd) } : {}) });
}
