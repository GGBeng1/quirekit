/** Host-owned approval presentation state. */
export type QuireKitChatConfirmationState = 'pending' | 'submitting' | 'approved' | 'rejected' | 'expired' | 'failed';

/** A single approval decision intent; authorization remains with the host. */
export interface QuireKitChatConfirmationDecision {
  /** Stable host request identity. */
  readonly requestId: string;
  /** Explicit user choice. */
  readonly decision: 'approve' | 'reject';
}

/** What the user is deciding: letting an action run, or accepting reviewed changes. */
export type QuireKitChatConfirmationIntent = 'permission' | 'review';

/** Public approval UI projection. */
export interface QuireKitChatConfirmationProps {
  /** Stable request identity, distinct from message or tool identity. */
  readonly requestId: string;
  /** Action the user is being asked to authorize. */
  readonly title: string;
  /** Concise scope or consequence of the action. */
  readonly description?: string;
  /** Host-owned state; clicks never imply approval. */
  readonly state: QuireKitChatConfirmationState;
  /** Failure reason, retained while the same request can be retried. */
  readonly error?: string;
  /** Wording of the decision; defaults to `permission`. */
  readonly intent?: QuireKitChatConfirmationIntent;
}

/** Content belonging to the same review and decision, without a second approval surface. */
export interface QuireKitChatConfirmationSlots {
  /** Evidence or preview between the description and decision actions; the host owns its data. */
  readonly default?: () => unknown;
}
