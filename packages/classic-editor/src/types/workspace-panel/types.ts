import type { QuireEditor } from "@quirekit/core";
import type { ClassicEditorMountedRenderable } from "../contributions";
import type {
  ClassicEditorLocale,
  ClassicEditorResolvedFeatures,
  ClassicEditorText,
  ClassicEditorViewBackend
} from "../base";
import type { ClassicEditorHostJobSnapshot } from "../host";
import type { ClassicEditorTaskFeedbackSnapshot } from "../tasks";
import type { ClassicEditorUiController } from "../ui";

/** Product task families admitted to the single Workspace Panel slot. */
export type ClassicEditorWorkspacePanelKind =
  | "paragraph"
  | "object"
  | "review"
  | "find"
  | "ai"
  | "task";

/** Stable semantic target families retained independently from the live selection. */
export type ClassicEditorWorkspacePanelTargetKind =
  | "document"
  | "selection"
  | "object"
  | "story"
  | "task";

/** Explicit stable target retained by one Workspace Panel entry. */
export interface ClassicEditorWorkspacePanelTarget {
  /** Closed semantic target discriminator. */
  readonly kind: ClassicEditorWorkspacePanelTargetKind;
  /** Feature-owned stable identity; never a document position or current selection lookup. */
  readonly id: string;
  /** Owner that must still resolve the target. */
  readonly ownerId: string;
  /** Monotonic or opaque owner revision captured with the identity. */
  readonly revision: string;
  /** Localizable target label shown in the shared panel header. */
  readonly label: ClassicEditorText;
}

/** Closed availability language for a retained Workspace Panel target. */
export type ClassicEditorWorkspacePanelFreshnessStatus =
  | "ready"
  | "stale"
  | "unavailable"
  | "locked";

/** Immutable target freshness supplied only by the target owner. */
export interface ClassicEditorWorkspacePanelFreshness {
  /** Owner-local monotonic freshness revision. */
  readonly revision: number;
  /** Current availability of the exact retained target. */
  readonly status: ClassicEditorWorkspacePanelFreshnessStatus;
  /** Optional stable diagnostic code; presentation localizes it independently. */
  readonly reason: string | null;
}

/** Read-only external Host facts projected into feature-owned panel content. */
export interface ClassicEditorWorkspacePanelHostProjection {
  /** Latest immutable resource job facts without any start, cancel, or retry authority. */
  readonly resourceJob: ClassicEditorHostJobSnapshot | null;
  /** Latest immutable task facts without the mutable task controller. */
  readonly tasks: ClassicEditorTaskFeedbackSnapshot;
}

/** Narrow product facts admitted to feature-owned panel presentation. */
export interface ClassicEditorWorkspacePanelProductContext {
  /** Mounted Core editor used only through typed commands, chain, can, and reads. */
  readonly editor: QuireEditor;
  /** Root that owns this isolated Workspace Panel host. */
  readonly root: HTMLElement;
  /** Document used to create feature-owned presentation DOM. */
  readonly ownerDocument: Document;
  /** Resolved product feature switches. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Current product locale. */
  readonly locale: ClassicEditorLocale;
  /** Current renderer fact without mounted View internals. */
  readonly backend: ClassicEditorViewBackend;
  /** Typed non-document product UI snapshot authority. */
  readonly ui: ClassicEditorUiController;
}

/** Minimal explicit focus target retained without depending on an editor DOM. */
export interface ClassicEditorWorkspacePanelFocusTarget {
  /** Whether the target still belongs to its root. */
  readonly isConnected?: boolean | undefined;
  /**
   * Moves focus to the captured trigger or logical selection surface.
   *
   * @param options - Browser focus options supplied by the shared focus helper.
   */
  focus(options?: FocusOptions): void;
}

/** Navigation ports available to a mounted panel without document mutation authority. */
export interface ClassicEditorWorkspacePanelNavigation {
  /** @returns Whether the active subtask was removed. */
  back(): boolean;
  /**
   * Closes the one shared slot and restores its explicit return target.
   *
   * @param reason - Typed close reason used by lifecycle diagnostics.
   * @returns Whether an open panel was closed.
   */
  close(reason?: ClassicEditorWorkspacePanelCloseReason): boolean;
  /**
   * Updates the active entry's pinned presentation fact.
   *
   * @param pinned - Requested pinned state.
   * @returns Whether the state changed.
   */
  setPinned(pinned: boolean): boolean;
  /** @returns Whether focus moved to the root-local panel surface. */
  focus(): boolean;
}

/** Context received by one typed Workspace Panel contribution mount. */
export interface ClassicEditorWorkspacePanelMountContext {
  /** Narrow product facts without Classic instance or Host execution controllers. */
  readonly product: ClassicEditorWorkspacePanelProductContext;
  /** Current immutable stack entry projected by the unique host. */
  readonly entry: ClassicEditorWorkspacePanelEntry;
  /** Read-only Host and task facts; no external-effect methods are exposed. */
  readonly host: ClassicEditorWorkspacePanelHostProjection;
  /** Panel-only navigation ports with no document-mutation indirection. */
  readonly navigation: ClassicEditorWorkspacePanelNavigation;
}

/** Lifecycle returned by one feature-owned Workspace Panel contribution. */
export interface ClassicEditorWorkspacePanelMountedRenderable {
  /** DOM node or text appended to the shared panel body. */
  readonly element: Node | string | null;
  /**
   * Refreshes panel-specific entry, target, and read-only Host facts.
   *
   * @param context - Latest shared-host mount context.
   */
  updatePanel?(context: ClassicEditorWorkspacePanelMountContext): void;
  /** Releases framework roots, listeners, and feature-owned presentation resources. */
  destroy(): void;
}

/** Typed plugin contribution rendered inside the unique Workspace Panel host. */
export interface ClassicEditorWorkspacePanelContribution {
  /** Stable contribution identity used only for registration diagnostics. */
  readonly id: string;
  /** Closed product task family. */
  readonly kind: ClassicEditorWorkspacePanelKind;
  /** Localizable primary panel title. */
  readonly title: ClassicEditorText;
  /**
   * Mounts feature-owned content into the shared chrome.
   *
   * @param context - Immutable entry, read-only Host facts, and typed navigation.
   * @returns Lifecycle-safe mounted content.
   */
  mount(
    context: ClassicEditorWorkspacePanelMountContext
  ): ClassicEditorWorkspacePanelMountedRenderable;
  /**
   * Connects one plugin-owned trigger to this instance-local host.
   *
   * The callback may retain the typed controller but cannot register a string
   * executable string or raw document-mutation channel.
   *
   * @param controller - Typed host controller for this Classic instance.
   * @returns Optional connection cleanup.
   */
  connect?(controller: ClassicEditorWorkspacePanelController): (() => void) | void;
}

/** Mounted legacy workspace widget that also contributes one typed panel definition. */
export interface ClassicEditorWorkspacePanelProvider extends ClassicEditorMountedRenderable {
  /** Typed panel definition discovered from the mounted plugin contribution. */
  readonly workspacePanel: ClassicEditorWorkspacePanelContribution;
}

/** Exact request required to open, replace, or push one panel entry. */
export interface ClassicEditorWorkspacePanelRequest {
  /** Direct contribution object; ids are never looked up as executable actions. */
  readonly contribution: ClassicEditorWorkspacePanelContribution;
  /** Stable target captured by the owning feature. */
  readonly target: ClassicEditorWorkspacePanelTarget;
  /** Initial freshness for the exact target. */
  readonly freshness: ClassicEditorWorkspacePanelFreshness;
  /** Explicit trigger or logical selection focus target restored on final close. */
  readonly returnFocus: ClassicEditorWorkspacePanelFocusTarget | null;
}

/** Immutable visible entry in the shared Workspace Panel stack. */
export interface ClassicEditorWorkspacePanelEntry {
  /** Runtime-unique occurrence identity. */
  readonly entryId: string;
  /** Direct contribution retained by this occurrence. */
  readonly contribution: ClassicEditorWorkspacePanelContribution;
  /** Stable target retained by this occurrence. */
  readonly target: ClassicEditorWorkspacePanelTarget;
  /** Latest owner-supplied freshness for the retained target. */
  readonly freshness: ClassicEditorWorkspacePanelFreshness;
  /** Whether layout may keep this workspace visible across incidental target changes. */
  readonly pinned: boolean;
  /** Explicit final focus-return target captured for this occurrence. */
  readonly returnFocus: ClassicEditorWorkspacePanelFocusTarget | null;
}

/** Immutable instance-local Workspace Panel state. */
export interface ClassicEditorWorkspacePanelSnapshot {
  /** Monotonic controller revision. */
  readonly revision: number;
  /** One visible navigation stack; the final item is active. */
  readonly stack: readonly ClassicEditorWorkspacePanelEntry[];
  /** Current active entry, or null while the slot is closed. */
  readonly active: ClassicEditorWorkspacePanelEntry | null;
  /** Whether a typed subtask can navigate back. */
  readonly canBack: boolean;
  /** Last close reason for lifecycle diagnostics. */
  readonly closeReason: ClassicEditorWorkspacePanelCloseReason | null;
}

/** Typed reasons that close one Workspace Panel stack. */
export type ClassicEditorWorkspacePanelCloseReason =
  | "explicit"
  | "escape"
  | "replace"
  | "contribution-removed"
  | "unmount"
  | "destroy";

/** Listener notified after an immutable panel snapshot commits. */
export type ClassicEditorWorkspacePanelListener = (
  snapshot: ClassicEditorWorkspacePanelSnapshot
) => void;

/** Instance-scoped typed authority for the single Workspace Panel slot. */
export interface ClassicEditorWorkspacePanelController
  extends ClassicEditorWorkspacePanelNavigation {
  /** Current immutable stack state. */
  readonly snapshot: ClassicEditorWorkspacePanelSnapshot;
  /**
   * Subscribes with immediate replay.
   *
   * @param listener - Snapshot consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(listener: ClassicEditorWorkspacePanelListener): () => void;
  /**
   * Registers one direct typed plugin contribution.
   *
   * @param contribution - Direct contribution object.
   * @returns Cleanup that unregisters only this exact object.
   */
  register(contribution: ClassicEditorWorkspacePanelContribution): () => void;
  /**
   * Opens a primary workspace, replacing any existing primary stack.
   *
   * @param request - Contribution, stable target, freshness, and focus facts.
   * @returns Whether the request was accepted.
   */
  open(request: ClassicEditorWorkspacePanelRequest): boolean;
  /**
   * Replaces the complete active task with a new primary workspace.
   *
   * @param request - Contribution, stable target, freshness, and focus facts.
   * @returns Whether the request was accepted.
   */
  replace(request: ClassicEditorWorkspacePanelRequest): boolean;
  /**
   * Pushes one typed subtask above the current workspace.
   *
   * @param request - Contribution, stable target, freshness, and focus facts.
   * @returns Whether the request was accepted.
   */
  push(request: ClassicEditorWorkspacePanelRequest): boolean;
  /**
   * Applies freshness only to exact retained target identities.
   *
   * @param target - Exact stable target supplied by its owner.
   * @param freshness - Monotonic availability update.
   * @returns Whether an entry changed.
   */
  updateFreshness(
    target: ClassicEditorWorkspacePanelTarget,
    freshness: ClassicEditorWorkspacePanelFreshness
  ): boolean;
}
