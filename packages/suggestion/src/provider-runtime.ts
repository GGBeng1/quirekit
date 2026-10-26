// Provider settlement is correlated here so surfaces never own request freshness.
import {
  createSuggestionProviderSlots,
  resolveSuggestionProviderResults
} from "./providers";
import { normalizeSuggestionHighlight, type SuggestionSessionRuntime } from "./state";
import type { SuggestionProvider, SuggestionResult } from "./types";

/** Async provider runner isolated from controller lifecycle and keyboard policy. */
export class SuggestionProviderRuntime<Bookmark, Action> {
  private currentSession: SuggestionSessionRuntime<Bookmark, Action> | undefined;

  /**
   * Creates one runner over already validated provider declarations.
   *
   * @param providers - Ordered suggestion providers.
   * @param publish - Callback that projects a settled provider snapshot.
   */
  constructor(
    private readonly providers: readonly SuggestionProvider<Bookmark, Action>[],
    private readonly publish: () => void
  ) {}

  /**
   * Starts a correlated provider batch and aborts the prior batch.
   *
   * @param session - Active controller session to query and update.
   */
  request(session: SuggestionSessionRuntime<Bookmark, Action>): void {
    this.abort();
    this.currentSession = session;
    const abortController = new AbortController();
    session.abortController = abortController;
    session.requestId += 1;
    session.providers = createSuggestionProviderSlots(
      this.providers,
      session.trigger.kind
    );
    session.highlightedIndex = null;
    this.publish();
    for (const provider of this.providers) {
      if (provider.trigger === session.trigger.kind) {
        this.run(provider, session, abortController);
      }
    }
  }

  /** Aborts the current provider batch and clears correlation ownership. */
  abort(): void {
    this.currentSession?.abortController?.abort();
    this.currentSession = undefined;
  }

  /**
   * Runs one provider and correlates both success and failure.
   *
   * @param provider - Matching provider declaration.
   * @param session - Active session at request creation.
   * @param abortController - Batch abort authority.
   */
  private run(
    provider: SuggestionProvider<Bookmark, Action>,
    session: SuggestionSessionRuntime<Bookmark, Action>,
    abortController: AbortController
  ): void {
    const requestId = session.requestId;
    const request = Object.freeze({
      sessionId: session.id,
      requestId,
      trigger: session.trigger,
      query: session.query,
      target: session.target,
      signal: abortController.signal
    });
    try {
      void Promise.resolve(provider.provide(request)).then(
        (results) => this.settle(provider, session.id, requestId, results),
        () => this.fail(provider.id, session.id, requestId)
      );
    } catch {
      this.fail(provider.id, session.id, requestId);
    }
  }

  /**
   * Applies one successful result only when session and request still correlate.
   *
   * @param provider - Provider owning the results.
   * @param sessionId - Session correlation id.
   * @param requestId - Request correlation id.
   * @param results - Ordered provider results.
   */
  private settle(
    provider: SuggestionProvider<Bookmark, Action>,
    sessionId: string,
    requestId: number,
    results: readonly SuggestionResult<Action>[]
  ): void {
    const slot = this.resolveCurrentSlot(provider.id, sessionId, requestId);
    if (slot === undefined) return;
    try {
      slot.results = resolveSuggestionProviderResults(provider, results);
      slot.phase = slot.results.length === 0 ? "empty" : "ready";
    } catch {
      slot.results = Object.freeze([]);
      slot.phase = "error";
    }
    this.normalizeAndPublish();
  }

  /**
   * Applies a provider failure without exposing thrown error content.
   *
   * @param providerId - Provider correlation id.
   * @param sessionId - Session correlation id.
   * @param requestId - Request correlation id.
   */
  private fail(providerId: string, sessionId: string, requestId: number): void {
    const slot = this.resolveCurrentSlot(providerId, sessionId, requestId);
    if (slot === undefined) return;
    slot.results = Object.freeze([]);
    slot.phase = "error";
    this.normalizeAndPublish();
  }

  /**
   * Resolves a current provider slot while rejecting aborts and late results.
   *
   * @param providerId - Provider correlation id.
   * @param sessionId - Session correlation id.
   * @param requestId - Request correlation id.
   * @returns Matching mutable slot, or undefined for stale work.
   */
  private resolveCurrentSlot(
    providerId: string,
    sessionId: string,
    requestId: number
  ) {
    const session = this.currentSession;
    if (
      session === undefined
      || session.id !== sessionId
      || session.requestId !== requestId
      || session.abortController?.signal.aborted === true
    ) return undefined;
    return session.providers.find(({ id }) => id === providerId);
  }

  /** Reconciles highlight after provider settlement and publishes state. */
  private normalizeAndPublish(): void {
    const session = this.currentSession;
    if (session === undefined) return;
    const count = session.providers.reduce(
      (total, provider) => total + provider.results.length,
      0
    );
    session.highlightedIndex = normalizeSuggestionHighlight(
      session.highlightedIndex,
      count
    );
    this.publish();
  }
}
