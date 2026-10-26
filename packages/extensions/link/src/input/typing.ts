import { Mapping, Plugin, PluginKey, ReplaceStep, type EditorView, type EditorState } from "@quirekit/pm";
import { captureLinkTypingIntent } from "./candidate";
import type { LinkTypingIntent } from "./types";

const intents = new WeakMap<EditorState, LinkTypingIntent>();
const pendingIntents = new WeakSet<LinkTypingIntent>();

/** @param view - Native input owner. @param name - Link mark. @param text - Whitespace or null for Enter. */
export function rememberLinkTypingIntent(view: EditorView, name: string, text: string | null): void {
  const state = view.state;
  intents.delete(state);
  const type = state.schema.marks[name];
  const intent = type && !view.composing ? captureLinkTypingIntent(state, type, text) : null;
  if (!intent) return;
  intents.set(state, intent);
  pendingIntents.add(intent);
  // A canceled event cannot authorize a later programmatic or remote transaction.
  queueMicrotask(() => { pendingIntents.delete(intent); });
}

/**
 * Completes native URLs after the existing input/Enter owner accepts its transaction.
 * @param name - Installed Link mark name.
 * @returns An event-scoped plugin with no whole-document scanning.
 */
export function createLinkTypingPlugin(name: string): Plugin {
  return new Plugin({
    key: new PluginKey("linkTyping"),
    props: {
      /** @param view - Input view. @param from - Replacement start. @param to - Replacement end. @param text - Inserted text. @returns False to retain native input ownership. */
      handleTextInput(view, from, to, text) {
        intents.delete(view.state);
        if (from === to && from === view.state.selection.from && /^[ \t\u00a0]$/u.test(text)) rememberLinkTypingIntent(view, name, text);
        return false;
      }
    },
    /** @param transactions - Accepted input transactions. @param oldState - Pre-input state. @param state - Accepted state. @returns Link-only history-linked addition, if the exact event completed. */
    appendTransaction(transactions, oldState, state) {
      const intent = intents.get(oldState);
      intents.delete(oldState);
      if (!intent || !pendingIntents.has(intent) || oldState.doc !== intent.doc || oldState.selection.from !== intent.caret) return null;
      const first = transactions.find(tr => tr.docChanged);
      // Declined bound shortcuts can dispatch a no-op before the native Enter
      // owner splits the paragraph. Carry only the same event and caret forward.
      if (!first && state.doc === intent.doc && state.selection.eq(oldState.selection)) {
        intents.set(state, intent);
        return null;
      }
      pendingIntents.delete(intent);
      if (!first || first.getMeta("uiEvent") === "paste" || !first.steps.some(step => (
        step instanceof ReplaceStep && step.from === intent.caret && step.to === intent.caret
        && (intent.text === null ? step.slice.openStart > 0 && step.slice.size === 2
          : step.slice.size === intent.text.length && step.slice.content.textBetween(0, step.slice.content.size) === intent.text)
      ))) return null;
      const mapping = new Mapping();
      for (const tr of transactions) mapping.appendMapping(tr.mapping);
      const from = mapping.map(intent.from, 1);
      const to = mapping.map(intent.to, -1);
      if (from >= to || !state.doc.slice(from, to).eq(intent.doc.slice(intent.from, intent.to))) return null;
      const type = state.schema.marks[name]!;
      return state.tr.addMark(from, to, type.create({ href: intent.href }));
    }
  });
}
