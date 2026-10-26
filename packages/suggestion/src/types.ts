/** Trigger families sharing the headless, command-neutral suggestion lifecycle. */
export type SuggestionTriggerKind = "slash" | "mention" | "emoji";

/** Stable trigger that opened a suggestion session. */
export interface SuggestionTrigger {
  /** Semantic trigger family. */
  readonly kind: SuggestionTriggerKind;
  /** Exact committed trigger text. */
  readonly text: "/" | "@" | ":";
}

/** Explicit source target retained without consulting the current caret. */
export interface SuggestionTarget<Bookmark> {
  /** Stable source identity across transaction mapping. */
  readonly id: string;
  /** Monotonic source generation. */
  readonly generation: number;
  /** Feature-owned bookmark or range facts. */
  readonly bookmark: Bookmark;
}

/** Command-neutral provider request correlated to one session revision. */
export interface SuggestionProviderRequest<Bookmark> {
  /** Stable active session id. */
  readonly sessionId: string;
  /** Monotonic request revision inside the session. */
  readonly requestId: number;
  /** Trigger family and source text. */
  readonly trigger: SuggestionTrigger;
  /** Current query after the trigger. */
  readonly query: string;
  /** Explicit remappable source target. */
  readonly target: SuggestionTarget<Bookmark>;
  /** Abort signal invalidated by query, remap, cancel, or destroy. */
  readonly signal: AbortSignal;
}

/** One provider-owned result carrying an opaque typed action. */
export interface SuggestionResult<Action> {
  /** Stable result id within its provider. */
  readonly id: string;
  /** Human-readable provider-owned label. */
  readonly label: string;
  /** Typed action executed later by a feature-owned command adapter. */
  readonly action: Action;
  /** Optional searchable aliases retained for surface filtering. */
  readonly keywords?: readonly string[] | undefined;
}

/** Async or sync provider for one trigger family and result group. */
export interface SuggestionProvider<Bookmark, Action> {
  /** Stable provider id unique within one controller. */
  readonly id: string;
  /** Trigger family accepted by this provider. */
  readonly trigger: SuggestionTriggerKind;
  /** Stable result group used by later surfaces. */
  readonly group: string;
  /**
   * Resolves results without mutating the editor or product UI.
   *
   * @param request - Correlated query, target, and cancellation facts.
   * @returns Ordered provider results, synchronously or asynchronously.
   */
  provide(
    request: SuggestionProviderRequest<Bookmark>
  ): readonly SuggestionResult<Action>[] | Promise<readonly SuggestionResult<Action>[]>;
}

/** Provider request state projected into the immutable snapshot. */
export type SuggestionProviderPhase = "loading" | "ready" | "empty" | "error";

/** Immutable provider status that never exposes a raw thrown error. */
export interface SuggestionProviderState {
  /** Stable provider id. */
  readonly id: string;
  /** Stable surface group. */
  readonly group: string;
  /** Current request state. */
  readonly phase: SuggestionProviderPhase;
  /** Stable localizable failure code for an error state. */
  readonly errorCode?: "provider-failed" | undefined;
}

/** Provider result resolved into one collision-free controller row. */
export interface ResolvedSuggestionResult<Action> {
  /** Provider/result composite identity. */
  readonly key: string;
  /** Owning provider id. */
  readonly providerId: string;
  /** Owning provider group. */
  readonly group: string;
  /** Original typed provider result. */
  readonly result: SuggestionResult<Action>;
}

/** Aggregate suggestion lifecycle phase. */
export type SuggestionPhase = "idle" | "loading" | "ready" | "empty" | "error";

/** Immutable controller state shared by slash, mention, and emoji surfaces. */
export interface SuggestionState<Bookmark, Action> {
  /** Aggregate lifecycle phase. */
  readonly phase: SuggestionPhase;
  /** Stable active session id, or null while idle. */
  readonly sessionId: string | null;
  /** Active root identity, or null while idle. */
  readonly root: object | null;
  /** Active trigger, or null while idle. */
  readonly trigger: SuggestionTrigger | null;
  /** Current query after the trigger. */
  readonly query: string;
  /** Explicit source target, or null while idle. */
  readonly target: SuggestionTarget<Bookmark> | null;
  /** Current request revision. */
  readonly requestId: number;
  /** Per-provider loading, ready, empty, or error facts. */
  readonly providers: readonly SuggestionProviderState[];
  /** Flattened deterministic provider results. */
  readonly results: readonly ResolvedSuggestionResult<Action>[];
  /** Highlighted result index, or null without results. */
  readonly highlightedIndex: number | null;
  /** Whether mounted input currently owns an IME composition. */
  readonly composing: boolean;
  /** Most recent close reason, or null for an active/new controller. */
  readonly cancelReason: SuggestionCancelReason | null;
}

/** Explicit input required to open a session at a canonical target. */
export interface SuggestionSessionInput<Bookmark> {
  /** Editor root that owns overlay isolation. */
  readonly root: object;
  /** Trigger family and exact source text. */
  readonly trigger: SuggestionTrigger;
  /** Query already committed after the trigger. */
  readonly query: string;
  /** Explicit source bookmark; current caret fallback is forbidden. */
  readonly target: SuggestionTarget<Bookmark>;
  /** Focus return owned by the mounted editor or trigger. */
  readonly restoreFocus: () => void;
}

/** Typed acceptance returned for a feature command adapter to execute. */
export interface SuggestionAcceptIntent<Bookmark, Action> {
  /** Session that produced this acceptance. */
  readonly sessionId: string;
  /** Trigger that selected the action. */
  readonly trigger: SuggestionTrigger;
  /** Query at acceptance time. */
  readonly query: string;
  /** Explicit remapped target retained for the feature command. */
  readonly target: SuggestionTarget<Bookmark>;
  /** Selected provider result and typed action. */
  readonly selection: ResolvedSuggestionResult<Action>;
}

/** Reasons why the command-neutral controller closes one session. */
export type SuggestionCancelReason =
  | "accept"
  | "composition"
  | "destroy"
  | "manual"
  | "overlay-dismiss"
  | "replaced"
  | "target-stale";

/** Result of keyboard routing performed before feature command execution. */
export interface SuggestionKeyboardResult<Bookmark, Action> {
  /** Whether the active suggestion consumed the key. */
  readonly handled: boolean;
  /** Typed acceptance for Enter or Tab, when available. */
  readonly acceptance?: SuggestionAcceptIntent<Bookmark, Action> | undefined;
}

/** Root-local overlay seam implemented by the Classic canonical stack. */
export interface SuggestionOverlayPort {
  /** Opens one root-owned suggestion overlay. */
  open(input: {
    /** Stable overlay/session id. */
    readonly id: string;
    /** Owning editor root. */
    readonly root: object;
    /** Controlled dismissal callback from the canonical stack. */
    readonly dismiss: () => void;
    /** Focus-return callback retained by the stack. */
    readonly restoreFocus: () => void;
  }): void;
  /**
   * Releases the controlled overlay without creating a second stack.
   *
   * @param restoreFocus - Whether controlled close returns focus immediately.
   */
  release(restoreFocus: boolean): void;
}

/** Listener receiving every immutable state transition. */
export type SuggestionStateListener<Bookmark, Action> = (
  state: SuggestionState<Bookmark, Action>
) => void;
