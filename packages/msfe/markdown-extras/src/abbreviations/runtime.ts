import { syntaxTree } from "@quirekit/cm-language";
import { Decoration, ViewPlugin, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import type { Range } from "@quirekit/cm-state";
import { readSourcePresentation } from "@quirekit/msfe-core";
import { projectAbbreviations } from "./projection";

const work = new WeakMap<EditorView, number>();

/** @param view - Mounted source owner. @returns Visible text matches, with no block-height changes or secondary model. */
function project(view: EditorView) {
  work.set(view, (work.get(view) ?? 0) + 1);
  const presentation = readSourcePresentation(view.state);
  if (presentation.mode === "source") return Decoration.none;
  const ranges: Range<Decoration>[] = [];
  for (const visible of view.visibleRanges) syntaxTree(view.state).iterate({ ...visible,
    enter(reference) {
      if (!/^(?:Paragraph|ATXHeading[1-6]|SetextHeading[12]|TableCell|DefinitionTerm)$/u.test(reference.name)) return;
      ranges.push(...projectAbbreviations({ state: view.state, node: reference.node, ...visible }));
      return false;
    },
  });
  return Decoration.set(ranges, true);
}

/** Source/tree/mode/viewport dependent text presentation; selection changes reuse all marks. */
export const abbreviationProjection = ViewPlugin.define(view => ({ decorations: project(view),
  /** @param update - Accepted state and viewport changes. */
  update(update: ViewUpdate) {
    const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
    if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)
      || before.mode !== after.mode) this.decorations = project(update.view);
  },
  /** Releases instance instrumentation with the native view. */
  destroy() { work.delete(view); },
}), { decorations: value => value.decorations });

/** @param view - Mounted instance. @returns Number of actual visible matching passes, without performing work. */
export function getAbbreviationWork(view: EditorView): number { return work.get(view) ?? 0; }
