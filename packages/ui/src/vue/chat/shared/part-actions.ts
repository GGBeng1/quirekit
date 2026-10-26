import type { QuireKitChatAction, QuireKitChatMessageState, QuireKitChatProcessState, QuireKitChatQuestionState, QuireKitChatConfirmationState } from '../../../components/chat';

/** Local commands remain available by default; explicit timing still follows process state.
 * @param actions - Part-local action descriptions.
 * @returns Timing-normalized commands without mutating consumer data.
 */
export function localActions(actions: readonly QuireKitChatAction[] = []): readonly QuireKitChatAction[] {
  return actions.map(action => action.when ? action : { ...action, when: 'always' });
}

/** Map presentation states only for action timing, never infer execution success.
 * @param state - Host-supplied process state.
 * @returns Message-style timing state for the shared action composition.
 */
export function actionState(state: QuireKitChatProcessState | QuireKitChatQuestionState | QuireKitChatConfirmationState): QuireKitChatMessageState {
  if (state === 'queued' || state === 'waiting') return 'pending';
  if (state === 'submitting') return 'pending';
  if (state === 'running') return 'streaming';
  if (state === 'succeeded' || state === 'approved' || state === 'rejected' || state === 'answered' || state === 'expired') return 'complete';
  if (state === 'failed') return 'error';
  if (state === 'cancelled') return 'stopped';
  return state;
}
