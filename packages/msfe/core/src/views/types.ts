import type { ChangeSpec, EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import type { SyntaxNode } from "@lezer/common";
import type { MsfeResult } from "../editor/types";
import type { ComponentViewEntry } from "./component/types";

/** Current logical UTF-16 source interval, invalidated when its syntax identity disappears. */
export interface MsfeSourceRange {
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
}

/** Source-derived component inputs; actions validate this snapshot before changing source. */
export interface MsfeNodeViewProps<Attrs extends object = object, Resource = unknown> {
  /** Local identity survives unrelated mapped insertions; it is not a serialized document id. */
  readonly id: string;
  /** Immutable semantic fields owned by the feature codec. */
  readonly attrs: Readonly<Attrs>;
  /** True for locked mode or a readonly editor. */
  readonly readOnly: boolean;
  /** Async resource state owned by this mounted view. */
  readonly status: "ready" | "loading" | "error";
  /** Resolved resource, never stored in Markdown. */
  readonly resource: Resource | undefined;
  /** @returns Current mapped range, or null for obsolete source or an unmounted view. */
  getRange(): MsfeSourceRange | null;
  /** @param patch - Supported semantic fields. @returns Atomic canonical mutation result. */
  updateAttributes(patch: Partial<Attrs>): MsfeResult;
  /** @returns Removal result through the same history and readonly authority. */
  deleteNode(): MsfeResult;
  /** @returns Whether current source was revealed and focused. */
  revealSource(): boolean;
}

/** Host resource returned by a feature, released once on replacement or unmount. */
export interface MsfeNodeViewResource<Resource = unknown> {
  /** Component-visible resource. */
  readonly value: Resource;
  /** Optional resource finalizer, including for late asynchronous results. */
  readonly release?: () => void;
}

/** Retained renderer lifecycle; update never replaces CodeMirror's input owner. */
export interface MsfeNodeViewHandle {
  /** @param props - New semantic inputs or resource state, never pure position changes. */
  update(props: MsfeNodeViewProps): void;
  /** Releases renderer subscriptions and framework portals. */
  destroy(): void;
}

/** Framework-neutral renderer mount boundary. */
export interface MsfeNodeViewMount {
  /** Inline non-editable DOM target owned by the runtime. */
  readonly dom: HTMLElement;
  /** Initial semantic snapshot. */
  readonly props: MsfeNodeViewProps;
  /** Optional framework host inherited from the editor consumer. */
  readonly host: MsfeComponentHost | undefined;
}

/** @param mount - Retained DOM target and source-bound inputs. @returns Disposable renderer handle. */
export type MsfeNodeViewRenderer = (mount: MsfeNodeViewMount) => MsfeNodeViewHandle;

/** Typed syntax codec, erased only after author configuration. */
export interface MsfeNodeViewDefinition<Attrs extends object, Resource = unknown> {
  /** Confirmed Lezer node kinds owned by this codec. */
  readonly nodes: readonly string[];
  /** Single-line replacement, or inline controls before an existing source line. */
  readonly placement: "replace" | "before";
  /** Whether controls remain visible while source is active, default false. */
  readonly showWhenActive?: boolean;
  /** Preserve a settled replacement's measured height offscreen, including error fallback; opt in for vertically expanding content. */
  readonly measureHeight?: boolean;
  /** @param state - Canonical source. @param node - Confirmed syntax. @returns Supported fields or source fallback. */
  readonly read: (state: EditorState, node: SyntaxNode) => Attrs | null;
  /** Optional bounded source fingerprint; defaults to the complete node and must cover every patchable field. */
  readonly source?: (state: EditorState, node: SyntaxNode) => string;
  /** @param state - Canonical source. @param node - Current syntax. @param patch - Requested fields. @returns Exact changes, or refusal. */
  readonly patch: (state: EditorState, node: SyntaxNode, patch: Partial<Attrs>) => ChangeSpec | null;
  /** Optional cancellable resource acquisition shared by every framework renderer. */
  readonly load?: (attrs: Readonly<Attrs>, signal: AbortSignal) => MsfeNodeViewResource<Resource> | Promise<MsfeNodeViewResource<Resource>>;
  /** Native fallback, replaceable by an extension's addNodeView. */
  readonly renderer: MsfeNodeViewRenderer;
}

/** Erased codec used only by the runtime; defineNodeView preserves author-side types. */
export type MsfeNodeViewSpec = MsfeNodeViewDefinition<object>;

/** One framework component in the existing host tree, keyed independently of its source offset. */
export interface MsfeComponentEntry {
  /** Stable local view identity. */
  readonly id: string;
  /** Framework-owned component definition. */
  readonly component: unknown;
  /** Portal/Teleport target. */
  readonly dom: HTMLElement;
  /** Latest source-bound inputs. */
  readonly props: MsfeNodeViewProps;
}

/** Minimal external store consumed by framework hosts; no framework imports in core. */
export interface MsfeComponentHost {
  /** @returns Generic views, separate from source-specific props but in the same provider tree. */
  getViewSnapshot(): readonly ComponentViewEntry[];
  /** @param entry - New or changed source-independent component. */
  publishView(entry: ComponentViewEntry): void;
  /** @param id - Generic component to unmount. */
  removeView(id: string): void;
  /** Framework guard prevents mounting into an incompatible provider. */
  readonly framework: "vue" | "react";
  /** @returns Referentially stable snapshot until a semantic change. */
  getSnapshot(): readonly MsfeComponentEntry[];
  /** @param listener - Store observer. @returns Unsubscribe callback. */
  subscribe(listener: () => void): () => void;
  /** @param entry - New or changed component. */
  publish(entry: MsfeComponentEntry): void;
  /** @param id - Unmounted view identity. */
  remove(id: string): void;
  /** Disposes all entries and listeners after editor destruction. */
  destroy(): void;
}

/** Internal tracked syntax identity; work is bounded by retained visible views. */
export interface ViewRecord {
  /** Stable mount identity. */
  readonly id: string;
  /** Current mapped start. */
  from: number;
  /** Current mapped end. */
  to: number;
  /** Exact syntax kind. */
  readonly name: string;
  /** Owning semantic codec. */
  readonly spec: MsfeNodeViewSpec;
  /** Current source snapshot used to reject stale callbacks. */
  source: string;
  /** Current immutable attributes. */
  attrs: object;
  /** Semantic version; position-only changes do not advance it. */
  version: number;
  /** Current editing permission. */
  readOnly: boolean;
  /** False after removal, document reset or runtime destruction. */
  alive: boolean;
  /** View supplying current state and measurement. */
  readonly view: EditorView;
}
