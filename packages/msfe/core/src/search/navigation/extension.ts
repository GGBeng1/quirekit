import { EditorState, type Extension } from "@quirekit/cm-state";
import { EditorView, ViewPlugin } from "@quirekit/cm-view";
import { navigationEffect } from "./effect";
import { SourceNavigation } from "./runtime";
import type { NavigationWork } from "./types";

/** @param cancelPresentation - Callback retiring an older presentation restore. @param work - Actual editor-lifetime counts. @returns Source-navigation lifecycle and native initial scroll, with no document mutation. */
export function sourceNavigation(cancelPresentation: () => void, work: NavigationWork): Extension {
  return [ViewPlugin.define(view => new SourceNavigation(view, cancelPresentation, work)), EditorState.transactionExtender.of(transaction => {
    const request = transaction.effects.filter(effect => effect.is(navigationEffect)).at(-1)?.value;
    return request ? { effects: EditorView.scrollIntoView(request.range, { y: request.y }) } : null;
  })];
}
