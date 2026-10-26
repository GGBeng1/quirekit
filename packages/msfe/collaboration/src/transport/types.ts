/** Ephemeral provider capability, independent of source updates and durable checkpoints. */
export interface CollaborationPresenceTransport {
  /** Connection identity used to exclude the current instance from remote participants. */
  readonly clientId: string;
  /** @returns Current states, keyed by provider-owned connection identity; payloads are untrusted. */
  getStates(): ReadonlyMap<string, unknown>;
  /** @param state - JSON-compatible local presence, or null to withdraw this connection. */
  publish(state: unknown | null): void;
  /** @param listener - State changes, including departures. @returns Unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Withdraws this lease and stops its resources; safe to call repeatedly. */
  release(): void;
}
