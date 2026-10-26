import type { Extension as CodeMirrorExtension, Transaction } from "@quirekit/cm-state";
import type { MarkdownExtension } from "@quirekit/lezer-markdown";
import type { MsfeEditor, MsfeChangeEvent } from "../editor/types";
import type { MsfeExtension, MsfeProjection } from "../extensions/types";
import type { RawCommands } from "../commands/types";
import type { MsfeNodeViewRenderer } from "../views/types";
import type { SourceSpec, Attributes } from "../source/authoring/types";
import type { InputRule, PasteRule } from "../rules/definition";
import type { StateSlot } from "../state/authoring/types";
import type { ProjectionLayer } from "../presentation/layers/types";
import type { MsfeSourceProvider } from "../source-provider/types";
import type { EditingBoundaryRule } from "../input/boundaries/types";
import type { BlockInputRule } from "../input/types";

/** Recursive options patch; arrays, functions and class instances are replaced. */
export type PartialOptions<T> = { [K in keyof T]?: T[K] extends readonly unknown[] | ((...args: never[]) => unknown)
  ? T[K] : T[K] extends object ? PartialOptions<T[K]> : T[K] };

/** A reusable definition that becomes a fresh descriptor on each editor installation. */
export interface AuthoringExtension {
  /** Unique install name. */
  readonly name: string;
  /** Explicit declaration family. */
  readonly type: "extension" | "node" | "mark";
  /** @param editor - Late editor access; unavailable during static compilation. @returns Instance descriptor. */
  resolve(editor: () => MsfeEditor): MsfeExtension;
}

/** Both legacy backend descriptors and modern author declarations remain installable. */
export type AnyExtension = MsfeExtension | AuthoringExtension;

/** Options hook context, also used when resolving inherited defaults. */
export interface OptionsContext<Options> {
  /** Final extension name, including a child's rename. */
  readonly name: string;
  /** Final declaration family. */
  readonly type: "extension" | "node" | "mark";
  /** Nearest ancestor's implementation of this hook. */
  readonly parent: (() => Options) | undefined;
}

/** Every inherited method is bound to the final configured instance. */
export interface ExtensionContext<Options, Storage, Parent = () => void> {
  /** Final extension name. */
  readonly name: string;
  /** Declaration family. */
  readonly type: "extension" | "node" | "mark";
  /** Independently resolved options for this installation. */
  readonly options: Options;
  /** Mutable storage owned by this editor. */
  readonly storage: Storage;
  /** Canonical editor; mounting is not complete during onBeforeCreate. */
  readonly editor: MsfeEditor;
  /** Nearest ancestor implementation of the currently executing hook. */
  readonly parent: Parent | undefined;
}

/** An incremental accepted transaction; selection-only changes do not call onUpdate. */
export interface TransactionEvent {
  /** Editor that accepted this transaction. */
  readonly editor: MsfeEditor;
  /** Backend transaction, explicitly exposed as a CodeMirror escape hatch. */
  readonly transaction: Transaction;
}

/** Declarative hooks shared by Extension, Node and Mark. Unsupported PM schema fields are rejected. */
export interface ExtensionConfig<Options extends object = Record<string, never>, Storage = Record<string, never>> {
  /** Requirement for CM inverse-effect history from advanced backend extensions. */
  readonly history?: "effects";
  /** @returns Prepared source/history authority; this hook must not allocate or connect resources. */
  addSourceProvider?(this: ExtensionContext<Options, Storage, () => MsfeSourceProvider>): MsfeSourceProvider;
  /** Stable unique name. Inherited if omitted by extend. */
  readonly name?: string;
  /** Higher priorities install first among dependency-ready extensions. */
  readonly priority?: number;
  /** Required extension names. */
  readonly requires?: readonly string[];
  /** @returns Default options, optionally composed with this.parent(). */
  addOptions?(this: OptionsContext<Options>): Options;
  /** @returns Mutable state allocated separately for every installation. */
  addStorage?(this: ExtensionContext<Options, Storage, () => Storage>): Storage;
  /** @returns Document-local transaction state slots and their explicit history policies. */
  addState?(this: ExtensionContext<Options, Storage, () => readonly StateSlot<unknown>[]>): readonly StateSlot<unknown>[];
  /** @returns Child definitions for a preset. */
  addExtensions?(this: ExtensionContext<Options, Storage, () => readonly AnyExtension[]>): readonly AnyExtension[];
  /** @returns Curried source commands; nested commands share one draft. */
  addCommands?(this: ExtensionContext<Options, Storage, () => Partial<RawCommands>>): Partial<RawCommands>;
  /**
   * @returns Facts describing this extension to the AI core, typed by `@quirekit/ai-contract`;
   * called only when an AI integration reads them.
   */
  addAiCapabilities?(this: ExtensionContext<Options, Storage, () => readonly unknown[]>): readonly unknown[];
  /** @returns Keyboard commands keyed by CodeMirror-compatible shortcut names. */
  addKeyboardShortcuts?(this: ExtensionContext<Options, Storage, () => Record<string, () => boolean>>): Record<string, () => boolean>;
  /** @returns Hidden source ownership shared by navigation, selection and native edits. */
  addEditingBoundaries?(this: ExtensionContext<Options, Storage, () => readonly EditingBoundaryRule[]>): readonly EditingBoundaryRule[];
  /** @returns Pure block-owned Enter behaviors routed through shared guards and atomic history. */
  addBlockInput?(this: ExtensionContext<Options, Storage, () => readonly BlockInputRule[]>): readonly BlockInputRule[];
  /** @returns Bounded source suffix transformations for native typing. */
  addInputRules?(this: ExtensionContext<Options, Storage, () => readonly InputRule[]>): readonly InputRule[];
  /** @returns Source transformations confined to the inserted clipboard text. */
  addPasteRules?(this: ExtensionContext<Options, Storage, () => readonly PasteRule[]>): readonly PasteRule[];
  /** @returns Source-bound codec. Source remains the only persistence authority. */
  addSource?(this: ExtensionContext<Options, Storage, () => SourceSpec>): SourceSpec;
  /** @returns Persisted source fields, defaults and validation; the codec controls exact encoding. */
  addAttributes?(this: ExtensionContext<Options, Storage, () => Attributes>): Attributes;
  /** @returns Renderer override; inherits the source codec without duplicating it. */
  addNodeView?(this: ExtensionContext<Options, Storage, () => MsfeNodeViewRenderer>): MsfeNodeViewRenderer;
  /** @returns Advanced backend language contributions. */
  addMarkdownExtensions?(this: ExtensionContext<Options, Storage, () => MarkdownExtension>): MarkdownExtension;
  /** @returns Advanced backend visual projections. */
  addProjections?(this: ExtensionContext<Options, Storage, () => readonly MsfeProjection[]>): readonly MsfeProjection[];
  /** @returns Composable declarative layers with explicit update and layout ownership. */
  addProjectionLayers?(this: ExtensionContext<Options, Storage, () => readonly ProjectionLayer[]>): readonly ProjectionLayer[];
  /** @returns Advanced backend extensions, such as syntax themes. */
  addCodeMirrorExtensions?(this: ExtensionContext<Options, Storage, () => CodeMirrorExtension>): CodeMirrorExtension;
  /** Runs after configuration and state construction, before any editor DOM is mounted. */
  onBeforeCreate?(this: ExtensionContext<Options, Storage>): void;
  /** @returns Optional disposer, called before onDestroy. */
  onCreate?(this: ExtensionContext<Options, Storage, () => void | (() => void)>): void | (() => void);
  /** @param event - Accepted source change, without full-document serialization. */
  onUpdate?(this: ExtensionContext<Options, Storage, (event: MsfeChangeEvent) => void>, event: MsfeChangeEvent): void;
  /** @param event - Every accepted transaction, including selections and effects. */
  onTransaction?(this: ExtensionContext<Options, Storage, (event: TransactionEvent) => void>, event: TransactionEvent): void;
  /** @param event - A transaction whose selection differs from the preceding state. */
  onSelectionUpdate?(this: ExtensionContext<Options, Storage, (event: TransactionEvent) => void>, event: TransactionEvent): void;
  /** @param event - Native editor focus event. */
  onFocus?(this: ExtensionContext<Options, Storage, (event: FocusEvent) => void>, event: FocusEvent): void;
  /** @param event - Native editor blur event. */
  onBlur?(this: ExtensionContext<Options, Storage, (event: FocusEvent) => void>, event: FocusEvent): void;
  /** Runs once on editor disposal, in reverse installation order. */
  onDestroy?(this: ExtensionContext<Options, Storage>): void;
}

/** Immutable declaration layers; a configured layer patches the result of addOptions at that point. */
export interface DefinitionLayer {
  /** Explicit hook and scalar overrides. */
  readonly config: Readonly<Record<string, unknown>>;
  /** configure patches, distinct from an overridden addOptions implementation. */
  readonly options?: unknown;
  /** Earlier definition; never modified. */
  readonly parent?: DefinitionLayer;
}
