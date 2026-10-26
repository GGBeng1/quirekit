import type { EditorSelection, EditorState, Extension, Range } from "@quirekit/cm-state";
import type { Decoration } from "@quirekit/cm-view";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownExtension } from "@quirekit/lezer-markdown";
import type { MsfeEditor, MsfeChangeEvent } from "../editor/types";
import type { CommandFactories } from "../commands/types";
import type { AuthorCommandFactories } from "../commands/types";
import type { AnyExtension, TransactionEvent } from "../authoring/types";
import type { InputRule, PasteRule } from "../rules/definition";
import type { MsfeNodeViewSpec, MsfeNodeViewRenderer } from "../views/types";
import type { MsfeMode } from "../state/types";
import type { SourceType } from "../source/semantics/types";
import type { StateSlot } from "../state/authoring/types";
import type { ProjectionLayer } from "../presentation/layers/types";
import type { MsfeSourceProvider } from "../source-provider/types";
import type { EditingBoundaryRule } from "../input/boundaries/types";
import type { BlockInputRule } from "../input/types";

/** Source-only inputs for one visible syntax projection. */
export interface ProjectionContext {
  /** Immutable canonical state. */
  readonly state: EditorState;
  /** Source-reveal selection, held during primary-pointer gestures; state.selection remains live. */
  readonly selection: EditorSelection;
  /** Confirmed parser node; never a separate persistent document. */
  readonly node: SyntaxNode;
  /** Current presentation mode. */
  readonly mode: MsfeMode;
  /** Whether the source-reveal selection intersects this node's configured owner in live mode. */
  readonly active: boolean;
  /** Start of the current visible source interval. */
  readonly from: number;
  /** End of the current visible source interval. */
  readonly to: number;
}

/** A feature owns projections for a disjoint set of parser node names. */
export interface MsfeProjection {
  /** Exact Lezer node names claimed by this feature. */
  readonly nodes: readonly string[];
  /** Wrap regular syntax/search marks without being split by their boundaries; uses CM outerDecorations. */
  readonly outer?: boolean;
  /** Pure projection; inline widgets and single-line replacements only. */
  readonly decorate: (context: ProjectionContext) => readonly Range<Decoration>[];
}

/** Instance-local MSFE extension descriptor. */
export interface MsfeExtension {
  /** Optional replacement of source and history, unique across the installed extension tree. */
  readonly sourceProvider?: MsfeSourceProvider;
  /** Explicit requirement for CM inverse-effect history in advanced backend contributions. */
  readonly history?: "effects";
  /** Stable unique feature identifier. */
  readonly id: string;
  /** Installed feature ids required before mounting. */
  readonly requires?: readonly string[];
  /** Dependency-ready descriptors are ordered by descending priority, default 100. */
  readonly priority?: number;
  /** Preset members; duplicates are errors rather than silently merged settings. */
  readonly includes?: readonly AnyExtension[];
  /** Pure typed planners bound into commands, can and chain. */
  readonly commands?: CommandFactories;
  /** Curried author commands compiled onto the same source transaction authority. */
  readonly authorCommands?: AuthorCommandFactories;
  /** @returns Facts describing this feature to the AI core; read when the AI integration needs them. */
  readonly aiCapabilities?: () => readonly unknown[];
  /** Priority-ordered source input rules. */
  readonly inputRules?: readonly InputRule[];
  /** Priority-ordered source paste rules. */
  readonly pasteRules?: readonly PasteRule[];
  /** Feature-owned source shells and legal content boundaries. */
  readonly editingBoundaries?: readonly EditingBoundaryRule[];
  /** Pure block-owned keyboard input; each syntax node has one declared owner. */
  readonly blockInput?: readonly BlockInputRule[];
  /** Grammar contributions compiled into the one canonical Markdown parser. */
  readonly syntax?: MarkdownExtension;
  /** Optional semantic codec, with no rendering requirement. */
  readonly source?: SourceType;
  /** Typed document-local transaction state contributions. */
  readonly states?: readonly StateSlot<unknown>[];
  /** Composable visual contributions with declared layout ownership. */
  readonly layers?: readonly ProjectionLayer[];
  /** Optional source-bound view codec. */
  readonly nodeView?: MsfeNodeViewSpec;
  /** Overrides only rendering, preserving this feature's source codec. */
  readonly addNodeView?: () => MsfeNodeViewRenderer;
  /** Allocates mutable instance state, never shared between configured descriptors. */
  readonly createStorage?: () => unknown;
  /** Runs after editor state construction and before DOM mounting. */
  readonly onBeforeCreate?: (context: MsfeExtensionContext) => void;
  /** Runs after mount; optional disposer runs before destruction in reverse order. */
  readonly onCreate?: (context: MsfeExtensionContext) => void | (() => void);
  /** Incremental document changes only; selection/viewport changes do not invoke this hook. */
  readonly onChange?: (context: MsfeExtensionContext, event: MsfeChangeEvent) => void;
  /** Every accepted transaction, including selection-only changes. */
  readonly onTransaction?: (context: MsfeExtensionContext, event: TransactionEvent) => void;
  /** Accepted transactions whose selections differ from the preceding state. */
  readonly onSelectionUpdate?: (context: MsfeExtensionContext, event: TransactionEvent) => void;
  /** Runs once after hook subscriptions and disposers end. */
  readonly onDestroy?: (context: MsfeExtensionContext) => void;
  /** Trusted CodeMirror language, keymap, theme or lifecycle extensions. */
  readonly extensions?: Extension;
  /** Optional syntax projection owners. */
  readonly projections?: readonly MsfeProjection[];
}

/** Validated immutable configuration shared by the mount and projector. */
export interface CompiledExtensions {
  /** Selected optional source owner, absent for the built-in standalone mode. */
  readonly sourceProvider?: MsfeSourceProvider;
  /** Deterministic dependency and priority order. */
  readonly ordered: readonly MsfeExtension[];
  /** Unique typed command factories erased at the registry boundary. */
  readonly commands: AuthorCommandFactories;
  /** Grammar configuration for the canonical parser. */
  readonly syntax: readonly MarkdownExtension[];
  /** Semantic types keyed by the author's public extension name. */
  readonly sources: ReadonlyMap<string, SourceType>;
  /** Priority-ordered composable layers. */
  readonly layers: readonly ProjectionLayer[];
  /** One source-view codec per syntax node. */
  readonly nodeViews: ReadonlyMap<string, MsfeNodeViewSpec>;
  /** CodeMirror extensions contributed by installed features. */
  readonly extensions: readonly Extension[];
  /** One projection owner per node name. */
  readonly projections: ReadonlyMap<string, MsfeProjection>;
}

/** Editor-local lifecycle inputs; storage is typed by the extension author at its boundary. */
export interface MsfeExtensionContext {
  /** Canonical editor API. */
  readonly editor: MsfeEditor;
  /** Fresh value produced by this extension's storage factory. */
  readonly storage: unknown;
}

/** Pure author configuration, evaluated without allocating browser resources. */
export interface ExtensionSetup<Options extends object> {
  /** Unique feature identifier. */
  readonly id: string;
  /** Shallow immutable defaults; nested values are owned by the author. */
  readonly options: Options;
  /** @param options - Resolved immutable options. @returns Feature contributions. */
  readonly setup: (options: Readonly<Options>) => Omit<MsfeExtension, "id">;
}

/** A reusable definition is itself installable and preserves configuration on extension. */
export interface ExtensionDefinition<Options extends object> extends MsfeExtension {
  /** Resolved shallow immutable options. */
  readonly options: Readonly<Options>;
  /** @param options - Shallow option overrides. @returns Independent definition. */
  configure(options: Partial<Options>): ExtensionDefinition<Options>;
  /** @param contributions - Explicit replacements for existing contributions. @returns Independent definition. */
  extend(contributions: Partial<MsfeExtension>): ExtensionDefinition<Options>;
}
