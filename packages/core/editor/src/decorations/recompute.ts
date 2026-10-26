import {
  DecorationSet,
  type EditorState,
  type EditorView,
  type Transaction
} from "@quirekit/pm";
import type { QuireEditor } from "../Editor";
import type { QuireRange } from "../types";
import {
  keepOwnedDecorations,
  resolveDecorationRebuildRanges,
  selectStaleDecorations
} from "./changed-ranges";
import type { Decoration } from "./decoration";
import {
  createDecorationSet,
  mapDecorationSet,
  readWidgetKey,
  type LoweredDecorationSet
} from "./sets";
import type { DecorationManagerState, DecorationSpec } from "./types";

/**
 * Recomputes one extension contribution using its declared update policy.
 *
 * @param editor - Editor that owns the contribution.
 * @param name - Producing extension name.
 * @param spec - Decoration specification.
 * @param previous - Previous manager state.
 * @param tr - Transaction being applied.
 * @param state - Editor state after the transaction.
 * @param forced - Whether a command explicitly forced recomputation.
 * @returns Recomputed decoration set and widget identities.
 */
export function recomputeDecorationContribution(
  editor: QuireEditor,
  name: string,
  spec: DecorationSpec,
  previous: DecorationManagerState,
  tr: Transaction,
  state: EditorState,
  forced: boolean
): LoweredDecorationSet {
  if (spec.update !== "changedRanges" || !tr.docChanged || forced) {
    return buildFullDecorationSet(editor, name, spec, state);
  }

  const resolution = resolveDecorationRebuildRanges(tr, state.doc);

  return resolution.type === "full"
    ? buildFullDecorationSet(editor, name, spec, state)
    : rebuildDecorationRanges(
        editor,
        name,
        spec,
        previous,
        tr,
        state,
        resolution.ranges
      );
}

/**
 * Maps a non-recomputed contribution through a transaction.
 *
 * @param name - Producing extension name.
 * @param previous - Previous manager state.
 * @param tr - Transaction being applied.
 * @returns Mapped decoration set and widget identities.
 */
export function mapPreviousDecorationContribution(
  name: string,
  previous: DecorationManagerState,
  tr: Transaction
): LoweredDecorationSet {
  const widgetKeys = new Set(previous.widgetKeysByExtension[name] ?? []);
  const set = mapDecorationSet(
    previous.decorationSetsByExtension[name] ?? DecorationSet.empty,
    tr.mapping,
    tr.doc,
    widgetKeys
  );

  return { set, widgetKeys };
}

/**
 * Builds the complete decoration set for one contribution.
 *
 * @param editor - Editor that owns the contribution.
 * @param name - Producing extension name.
 * @param spec - Decoration specification.
 * @param state - Exact editor state being projected.
 * @returns Complete decoration set and widget identities.
 */
export function buildFullDecorationSet(
  editor: QuireEditor,
  name: string,
  spec: DecorationSpec,
  state: EditorState
): LoweredDecorationSet {
  const decorations = runDecorationFactory(name, "create", () => spec.create({
    editor,
    state,
    view: mountedHTMLView(editor)
  }));

  return createDecorationSet(state.doc, decorations, name);
}

/**
 * Rebuilds only the top-level block ranges touched by a transaction.
 *
 * @param editor - Editor that owns the contribution.
 * @param name - Producing extension name.
 * @param spec - Changed-ranges decoration specification.
 * @param previous - Previous manager state.
 * @param tr - Transaction being applied.
 * @param state - Editor state after the transaction.
 * @param ranges - Top-level block ranges to replace.
 * @returns Updated decoration set and widget identities.
 */
function rebuildDecorationRanges(
  editor: QuireEditor,
  name: string,
  spec: DecorationSpec,
  previous: DecorationManagerState,
  tr: Transaction,
  state: EditorState,
  ranges: readonly QuireRange[]
): LoweredDecorationSet {
  const mapped = mapPreviousDecorationContribution(name, previous, tr);
  const widgetKeys = mapped.widgetKeys;
  let set = mapped.set;

  for (const range of ranges) {
    const stale = selectStaleDecorations(
      set.find(range.from, range.to),
      range,
      state.doc.content.size
    );

    for (const decoration of stale) {
      const key = readWidgetKey(decoration);
      if (key) widgetKeys.delete(key);
    }

    set = set.remove(stale);
    const created = runDecorationFactory(name, "createInRange", () =>
      spec.createInRange?.({
        editor,
        state,
        view: mountedHTMLView(editor),
        from: range.from,
        to: range.to
      }) ?? []
    );
    const owned = keepOwnedDecorations(
      created,
      range,
      state.doc.content.size
    );
    const added = createDecorationSet(state.doc, owned, name);
    set = set.add(state.doc, added.set.find());
    for (const key of added.widgetKeys) widgetKeys.add(key);
  }

  return { set, widgetKeys };
}

/**
 * Contains extension callback failures so a decoration cannot abort editing.
 *
 * @param name - Producing extension name.
 * @param method - Decoration factory that is being evaluated.
 * @param create - Factory invocation.
 * @returns Created decorations, or an empty collection after failure.
 */
function runDecorationFactory(
  name: string,
  method: "create" | "createInRange",
  create: () => Decoration[]
): Decoration[] {
  try {
    return create();
  } catch (error) {
    console.error(
      `[QuireKit] Extension "${name}" failed in addDecorations().${method}(); ` +
      "its decorations were dropped for this update.",
      error
    );

    return [];
  }
}

/**
 * Returns the mounted HTML view without leaking DOM assumptions to Canvas/SVG.
 *
 * @param editor - Editor whose current surface should be inspected.
 * @returns Mounted HTML view, or null on headless/Canvas/SVG surfaces.
 */
function mountedHTMLView(editor: QuireEditor): EditorView | null {
  const view = editor.mountedView;

  return view?.mode === "html" ? view as unknown as EditorView : null;
}
