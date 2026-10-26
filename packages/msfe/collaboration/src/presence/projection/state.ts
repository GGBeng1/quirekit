import { StateEffect, StateField } from "@quirekit/cm-state";
import type { ResolvedParticipant } from "../types";

/** Source-neutral replacement; never added to local history or the shared document. */
export const presenceEffect = StateEffect.define<readonly ResolvedParticipant[]>();
/** Resolved endpoints are retired on source change and rebuilt after the accepted CRDT transaction settles. */
export const presenceState = StateField.define<readonly ResolvedParticipant[]>({
  create: () => [],
  update(value, transaction) {
    const received = transaction.effects.find(effect => effect.is(presenceEffect));
    return received ? received.value : transaction.docChanged ? [] : value;
  },
});
