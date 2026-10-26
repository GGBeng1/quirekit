import {
  DecorationSet,
  Plugin,
  type EditorState,
  type Transaction
} from "@quirekit/pm";
import type { QuireEditor } from "../Editor";
import { DECORATION_MANAGER_PLUGIN_KEY } from "./plugin-key";
import {
  buildFullDecorationSet,
  mapPreviousDecorationContribution,
  recomputeDecorationContribution
} from "./recompute";
import { createDecorationManagerState } from "./state";
import type {
  DecorationManagerState,
  DecorationMeta,
  ResolvedDecorationEntry
} from "./types";

/**
 * Creates the stateful ProseMirror plugin for resolved decoration entries.
 *
 * @param editor - Editor that owns the entries.
 * @param entries - Enabled, validated decoration contributions.
 * @returns Manager plugin.
 */
export function createDecorationManagerPlugin(
  editor: QuireEditor,
  entries: readonly ResolvedDecorationEntry[]
): Plugin<DecorationManagerState> {
  return new Plugin<DecorationManagerState>({
    key: DECORATION_MANAGER_PLUGIN_KEY,
    state: {
      init: (_config, state) => initializeDecorationState(editor, entries, state),
      apply: (tr, previous, oldState, newState) => applyDecorationState(
        editor,
        entries,
        tr,
        previous,
        oldState,
        newState
      )
    },
    props: {
      decorations(state: EditorState) {
        return DECORATION_MANAGER_PLUGIN_KEY.getState(state)
          ?.mergedDecorationSet ?? DecorationSet.empty;
      }
    }
  });
}

/**
 * Builds initial manager state.
 *
 * @param editor - Editor that owns the entries.
 * @param entries - Resolved decoration contributions.
 * @param state - Initial editor state.
 * @returns Initialized manager state.
 */
function initializeDecorationState(
  editor: QuireEditor,
  entries: readonly ResolvedDecorationEntry[],
  state: EditorState
): DecorationManagerState {
  const sets: Record<string, DecorationSet> = {};
  const keys: Record<string, Set<string>> = {};

  for (const { name, spec } of entries) {
    const result = buildFullDecorationSet(editor, name, spec, state);
    sets[name] = result.set;
    keys[name] = result.widgetKeys;
  }

  return createDecorationManagerState(state, sets, keys);
}

/**
 * Advances manager state through one transaction.
 *
 * @param editor - Editor that owns the entries.
 * @param entries - Resolved decoration contributions.
 * @param tr - Transaction being applied.
 * @param previous - Manager state before the transaction.
 * @param oldState - Editor state before the transaction.
 * @param newState - Editor state after the transaction.
 * @returns Next manager state.
 */
function applyDecorationState(
  editor: QuireEditor,
  entries: readonly ResolvedDecorationEntry[],
  tr: Transaction,
  previous: DecorationManagerState,
  oldState: EditorState,
  newState: EditorState
): DecorationManagerState {
  const meta = tr.getMeta(DECORATION_MANAGER_PLUGIN_KEY) as
    | DecorationMeta
    | undefined;
  const sets: Record<string, DecorationSet> = {};
  const keys: Record<string, Set<string>> = {};

  for (const { name, spec } of entries) {
    const forced = meta?.type === "force" &&
      (meta.name === undefined || meta.name === name);
    const recompute = forced || (spec.update !== "manual" &&
      (spec.shouldUpdate?.({ editor, tr, oldState, newState }) ?? tr.docChanged));
    const result = recompute
      ? recomputeDecorationContribution(
          editor,
          name,
          spec,
          previous,
          tr,
          newState,
          forced
        )
      : mapPreviousDecorationContribution(name, previous, tr);

    sets[name] = result.set;
    keys[name] = result.widgetKeys;
  }

  if (!tr.docChanged && meta === undefined && everySetReused(previous, sets)) {
    return previous;
  }

  return createDecorationManagerState(newState, sets, keys);
}

/**
 * Checks whether every next set retained its previous object identity.
 *
 * @param previous - Previous manager state.
 * @param next - Next sets keyed by extension.
 * @returns Whether no set was changed or mapped.
 */
function everySetReused(
  previous: DecorationManagerState,
  next: Readonly<Record<string, DecorationSet>>
): boolean {
  return Object.entries(next).every(([name, set]) =>
    previous.decorationSetsByExtension[name] === set
  );
}
