import { MathAuthoringSession } from '../authoring/session';
import type { MathDocument } from '../model/types';
import type { MathEditor, MathEditorOptions, MathEditorHostPort, MathCommitResult } from './types';

/**
 * Correlates explicit host updates without moving draft authority into an adapter.
 * @param options - Initial source and optional host transaction.
 * @param port - Canonical session and lifecycle ports.
 * @returns Host lifecycle operations shared by every UI implementation.
 */
export function createMathEditorHost(options: MathEditorOptions, port: MathEditorHostPort): Pick<MathEditor, 'syncHost' | 'reload' | 'cancel' | 'commit'> {
  let source = options.latex;
  let submitted: MathDocument | undefined;
  const state = port.state;
  /**
   * Admits the latest host source only after an explicit local discard.
   * Unsupported source is loaded as an invalid draft that can be repaired in source form.
   * @returns Whether the whole source is supported.
   */
  function reload(): boolean {
    if (state.disposed || state.busy) return false;
    const session = new MathAuthoringSession(source);
    const supported = !session.getState().diagnostic;
    port.replace(session);
    state.conflict = false;
    state.feedback = supported ? undefined : 'unsupported-host';
    state.commandOpen = false;
    port.refresh();
    return supported;
  }
  /**
   * Tracks host source without overwriting a dirty draft or pending transaction.
   * @param latex - Latest exact host source.
   */
  function syncHost(latex: string): void {
    if (state.disposed || latex === source) return;
    source = latex;
    if (state.busy && submitted?.latex === latex) return;
    if (port.session().getState().dirty || state.busy) {
      state.conflict = true;
      port.refresh();
    }
    else reload();
  }
  /** Discards only local state; external conflicts remain explicit until reloaded. */
  function cancel(): void {
    if (state.disposed || state.busy) return;
    const restored = port.session().cancel();
    state.feedback = restored.diagnostic ? 'unsupported-host' : undefined;
    state.commandOpen = false;
    state.composing = false;
    state.preedit = '';
    port.refresh();
  }
  /**
   * Freezes edits until the matching host outcome is known.
   * @returns Complete success or a failure retaining exact local source.
   */
  async function commit(): Promise<MathCommitResult> {
    if (state.disposed) return { status: 'disposed' };
    if (!port.canCommit() || !options.commit) return { status: 'blocked' };
    const session = port.session();
    const result = session.prepareCommit();
    if (!result.ok) return { status: 'blocked' };
    submitted = result.document;
    state.busy = true;
    state.feedback = undefined;
    port.refresh();
    try {
      const accepted = await options.commit(submitted);
      // The host owns persistence. A different host source or closed instance invalidates acknowledgement.
      if (state.disposed) return { status: 'disposed' };
      if (state.conflict || session !== port.session()) return { status: 'conflict' };
      if (!accepted) {
        state.feedback = 'host-rejected';
        return { status: 'rejected' };
      }
      session.acceptCommit();
      source = result.document.latex;
      state.feedback = undefined;
      return { status: 'committed', document: result.document };
    } catch {
      if (state.disposed) return { status: 'disposed' };
      state.feedback = 'host-error';
      return { status: 'error' };
    } finally {
      submitted = undefined;
      if (!state.disposed) {
        state.busy = false;
        port.refresh();
      }
    }
  }
  return { syncHost, reload, cancel, commit };
}
