import { MathAuthoringSession } from '../authoring/session';
import { createMathPresentation } from '../presentation/create';
import type { MathPresentationSnapshot } from '../presentation/types';
import type { MathVisualSlot } from '../visual/types';
import { createMathEditorHost } from './host';
import { handleMathBeforeInput, handleMathKeyDown } from './input';
import { createMathEditorOperations } from './operations';
import type { MathEditor, MathEditorOptions, MathEditorSnapshot, MathEditorRuntimeState } from './types';

const noPresentation: MathPresentationSnapshot = Object.freeze({ ready: false, pending: false, layouts: 0 });

/**
 * Creates one formula authority without a browser, framework, UI or rendering dependency.
 * @param options - Host source, optional renderer and explicit host callback.
 * @returns Stable external store and typed local editing operations.
 */
export function createMathEditor(options: MathEditorOptions): MathEditor {
  let session = new MathAuthoringSession(options.latex);
  let snapshot: MathEditorSnapshot;
  let slots: readonly MathVisualSlot[] = [];
  let indexed = session.getState().preview;
  const listeners = new Set<(snapshot: MathEditorSnapshot) => void>();
  const state: MathEditorRuntimeState = {
    busy: false, conflict: false, disabled: options.disabled === true, focused: false, composing: false, preedit: '',
    commandOpen: false, feedback: session.getState().diagnostic ? 'unsupported-host' : undefined, disposed: false,
  };
  const presenter = options.renderer
    ? createMathPresentation({ renderer: options.renderer, editable: true, disposeRenderer: options.disposeRenderer === true })
    : undefined;

  /** Publishes changed immutable facts; source, slot and render identities remain stable on selection. */
  function publish(): void {
    const draft = session.getState();
    const presentation = presenter?.getSnapshot() ?? noPresentation;
    if (!slots.length || indexed !== draft.preview) {
      indexed = draft.preview;
      slots = draft.slots;
    }
    const canEdit = !state.disposed && !state.busy && !state.conflict && !state.disabled && !draft.diagnostic;
    const canCommit = canEdit && !!options.commit && !state.composing && (!presenter || presentation.ready);
    const next = {
      ...state,
      draft: draft.draft,
      document: draft.preview,
      diagnostic: draft.diagnostic,
      dirty: draft.dirty,
      selection: draft.selection,
      canUndo: draft.canUndo,
      canRedo: draft.canRedo,
      slots,
      presentation,
      canEdit,
      canCommit,
    };
    if (snapshot && Object.keys(next).every(key => next[key as keyof typeof next] === snapshot[key as keyof typeof next])) return;
    snapshot = Object.freeze({ ...next, revision: (snapshot?.revision ?? 0) + 1 });
    for (const listener of [...listeners]) listener(snapshot);
  }
  /** Advances only content-dependent presentation; pure overlays take the publish path. */
  function refresh(): void {
    presenter?.update(session.getState().preview);
    publish();
  }
  /**
   * Updates one runtime flag and publishes it.
   * @param update - Mutation of the private runtime state.
   */
  function setRuntime(update: () => void): void {
    if (state.disposed) return;
    update();
    publish();
  }

  const host = createMathEditorHost(options, {
    session: () => session,
    replace: value => { session = value; },
    refresh,
    canCommit: () => snapshot.canCommit,
    state,
  });
  const operations = createMathEditorOperations({
    session: () => session,
    slots: () => slots,
    editable: () => snapshot.canEdit && !state.composing,
    sourceEditable: () => !state.disposed && !state.busy && !state.conflict && !state.disabled && !state.composing,
    publish,
    refresh,
    state,
  });
  const editor: MathEditor = {
    ...host,
    ...operations,
    /** @returns Stable current immutable state. */
    getSnapshot: () => snapshot,
    /**
     * @param listener - Accepted snapshot listener.
     * @returns Idempotent unsubscribe.
     */
    subscribe(listener) {
      if (state.disposed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** @param disabled - Explicit host suspension. */
    setDisabled(disabled) { setRuntime(() => { state.disabled = disabled; }); },
    /** @param focused - Native/custom input ownership. */
    setFocused(focused) { setRuntime(() => { state.focused = focused; }); },
    /**
     * @param composing - IME ownership.
     * @param preedit - Candidate display text.
     */
    setComposition(composing, preedit) {
      setRuntime(() => {
        state.composing = composing;
        state.preedit = preedit;
      });
    },
    /** @param open - Command search visibility. */
    setCommandOpen(open) { setRuntime(() => { state.commandOpen = open; }); },
    /**
     * @param input - Normalized key facts.
     * @returns Native effects.
     */
    handleKeyDown(input) { return handleMathKeyDown(editor, input); },
    /**
     * @param input - Normalized text intent.
     * @returns Native effects.
     */
    handleBeforeInput(input) { return handleMathBeforeInput(editor, input); },
    /** Publishes final closure once, then stops every late output and listener. */
    destroy() {
      if (state.disposed) return;
      Object.assign(state, { disposed: true, busy: false, focused: false, composing: false, preedit: '', commandOpen: false });
      presenter?.destroy();
      publish();
      listeners.clear();
    },
  };
  publish();
  presenter?.subscribe(publish);
  refresh();
  return editor;
}
