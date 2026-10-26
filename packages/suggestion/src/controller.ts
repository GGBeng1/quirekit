import type { SuggestionControllerOptions } from "./controller-options";
import { validateSuggestionProviders } from "./providers";
import { SuggestionProviderRuntime } from "./provider-runtime";
import { resolveSuggestionInteraction } from "./interaction";
import { createSuggestionAcceptance, createSuggestionSession, freezeSuggestionTarget } from "./session";
import { createIdleSuggestionState, createSuggestionState, normalizeSuggestionHighlight, type SuggestionSessionRuntime } from "./state";
import { SuggestionStateStore } from "./store";
import { validateSuggestionTarget, validateSuggestionTrigger } from "./validation";
import type {
  SuggestionAcceptIntent,
  SuggestionCancelReason,
  SuggestionKeyboardResult,
  SuggestionOverlayPort,
  SuggestionProvider,
  SuggestionSessionInput,
  SuggestionState,
  SuggestionStateListener,
  SuggestionTarget
} from "./types";

/** Shared IME-safe, async-correlated state machine for product suggestions. */
export class SuggestionController<Bookmark, Action> {
  private readonly providers: readonly SuggestionProvider<Bookmark, Action>[];
  private readonly overlay: SuggestionOverlayPort;
  private readonly providerRuntime: SuggestionProviderRuntime<Bookmark, Action>;
  private readonly store: SuggestionStateStore<Bookmark, Action>;
  private session: SuggestionSessionRuntime<Bookmark, Action> | undefined;
  private composing = false;
  private destroyed = false;
  private nextSessionId = 0;

  /**
   * Creates one controller without registering document listeners or editor commands.
   * @param options - Providers and canonical overlay port.
   */
  constructor(options: SuggestionControllerOptions<Bookmark, Action>) {
    validateSuggestionProviders(options.providers);
    this.providers = Object.freeze([...options.providers]);
    this.overlay = options.overlay;
    this.store = new SuggestionStateStore(createIdleSuggestionState(false));
    this.providerRuntime = new SuggestionProviderRuntime(this.providers, () => this.publish());
  }
  /** @returns Current immutable suggestion state. */
  get state(): SuggestionState<Bookmark, Action> {
    return this.store.state;
  }
  /**
   * Subscribes to immutable state changes and immediately receives current state.
   * @param listener - State observer owned by a suggestion surface.
   * @returns Cleanup that removes the observer.
   */
  subscribe(listener: SuggestionStateListener<Bookmark, Action>): () => void {
    return this.store.subscribe(listener);
  }
  /**
   * Opens a session only from explicit trigger and target facts.
   * @param input - Root, trigger, committed query, bookmark, and focus return.
   * @returns Whether a new session was opened.
   */
  start(input: SuggestionSessionInput<Bookmark>): boolean {
    if (this.destroyed || this.composing) return false;
    validateSuggestionTrigger(input.trigger);
    validateSuggestionTarget(input.target);
    if (this.session !== undefined) this.finish("replaced", true, false);
    const id = `qk-suggestion-${++this.nextSessionId}`;
    this.session = createSuggestionSession(id, input);
    this.overlay.open({
      id,
      root: input.root,
      dismiss: () => this.dismissFromOverlay(id),
      restoreFocus: input.restoreFocus
    });
    this.providerRuntime.request(this.session);
    return true;
  }
  /**
   * Requeries every matching provider after committed input changes.
   * @param query - Complete committed query after the trigger.
   * @returns Whether an active non-composing session changed.
   */
  updateQuery(query: string): boolean {
    if (this.session === undefined || this.composing || query === this.session.query) return false;
    this.session.query = query;
    this.providerRuntime.request(this.session);
    return true;
  }
  /**
   * Suppresses suggestion work while IME owns preedit text.
   * @param composing - Current browser composition ownership.
   */
  setComposing(composing: boolean): void {
    if (this.composing === composing) return;
    this.composing = composing;
    if (composing && this.session !== undefined) {
      this.finish("composition", true, true);
      return;
    }
    this.publish();
  }
  /**
   * Remaps the explicit target after document or selection mapping.
   * @param mapper - Feature mapper returning the same identity at a nondecreasing generation.
   * @returns Whether the remapped target remains active.
   */
  remapTarget(
    mapper: (target: SuggestionTarget<Bookmark>) => SuggestionTarget<Bookmark> | null
  ): boolean {
    const session = this.session;
    if (session === undefined || this.composing) return false;
    const mapped = mapper(session.target);
    if (
      mapped === null
      || mapped.id !== session.target.id
      || mapped.generation < session.target.generation
    ) {
      this.finish("target-stale", true, true);
      return false;
    }
    validateSuggestionTarget(mapped);
    session.target = freezeSuggestionTarget(mapped);
    this.providerRuntime.request(session);
    return true;
  }
  /**
   * Routes list-navigation and acceptance keys; Escape remains overlay-owned.
   * @param key - Browser keyboard key.
   * @param isComposing - Event-level IME fact.
   * @returns Consumption and optional typed acceptance.
   */
  handleKey(key: string, isComposing = false): SuggestionKeyboardResult<Bookmark, Action> {
    if (this.session === undefined || this.composing || isComposing) return { handled: false };
    const interaction = resolveSuggestionInteraction(this.session, this.store.state, key);
    if (interaction.kind === "ignore") return { handled: false };
    if (interaction.kind === "accept") {
      const acceptance = interaction.acceptance;
      if (acceptance !== null) this.finish("accept", true, true);
      return acceptance === null ? { handled: true } : { handled: true, acceptance };
    }
    this.session.highlightedIndex = normalizeSuggestionHighlight(
      interaction.index,
      this.store.state.results.length
    );
    this.publish();
    return { handled: true };
  }
  /**
   * Returns the selected typed action without executing editor mutation.
   * @returns Acceptance intent, or null without a valid highlighted result.
   */
  acceptHighlighted(): SuggestionAcceptIntent<Bookmark, Action> | null {
    const session = this.session;
    if (session === undefined || this.composing) return null;
    const acceptance = createSuggestionAcceptance(session, this.store.state);
    if (acceptance === null) return null;
    this.finish("accept", true, true);
    return acceptance;
  }

  /** Cancels one active session without reading editor selection. */
  cancel(): void {
    if (this.session !== undefined) this.finish("manual", true, true);
  }

  /** Aborts work, releases overlay ownership, and makes the controller inert. */
  destroy(): void {
    if (this.destroyed) return;
    if (this.session !== undefined) this.finish("destroy", true, false);
    this.store.destroy();
    this.destroyed = true;
  }

  /** Ignores a stale overlay callback after a replacement session opened. */
  private dismissFromOverlay(sessionId: string): void {
    if (this.session?.id === sessionId) {
      this.finish("overlay-dismiss", false, false);
    }
  }

  /** Ends one session with explicit overlay and focus ownership. */
  private finish(
    reason: SuggestionCancelReason,
    releaseOverlay: boolean,
    restoreFocus: boolean
  ): void {
    this.providerRuntime.abort();
    this.session = undefined;
    if (releaseOverlay) this.overlay.release(restoreFocus);
    this.store.publish(createIdleSuggestionState(this.composing, reason));
  }

  /** Projects current mutable facts into one immutable snapshot. */
  private publish(): void {
    const state: SuggestionState<Bookmark, Action> = this.session === undefined
      ? createIdleSuggestionState(this.composing, this.store.state.cancelReason)
      : createSuggestionState(this.session, this.composing);
    this.store.publish(state);
  }
}
