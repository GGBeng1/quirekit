import type { MsfeCommand } from "../state/types";
import type { MsfeResult, MsfeTarget } from "../editor/types";
import type { EditorState, TransactionSpec } from "@quirekit/cm-state";
import type { MsfeEditor } from "../editor/types";
import type { Effect, Metadata } from "../state/authoring/types";

/** Packages augment namespaces here, matching the Core/Tiptap authoring pattern. */
export interface Commands<ReturnType> {
  /** Source-native editing primitives available in every editor. */
  core: {
    /** @param text - Text inserted at all selections. @returns Command result. */
    insertText: (text: string) => ReturnType;
    /** @param name - Installed semantic type. @param patch - Persisted fields. @returns Command result. */
    updateAttributes: (name: string, patch: object) => ReturnType;
  };
}

/** Turns extension namespaces into the editor's flat, typed command surface. */
type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (value: infer I) => void ? I : never;
/** Named commands with caller-selected return values. */
export type CommandMap<Result> = UnionToIntersection<Commands<Result>[keyof Commands<Result>]> & MsfeCommands<Result>;
/** Curried factories returned by addCommands. */
export type RawCommands = CommandMap<Command>;
/** Boolean command facade, with no truthy failure objects. */
export type SingleCommands = CommandMap<boolean>;
/** Applicability queries, including a disposable chained draft. */
export type CanCommands = SingleCommands & {
  /** @returns An atomic chain checked without publication. */
  chain(): ChainedCommands;
};
/** Fluent source commands publish once when run succeeds. */
export type ChainedCommands = {
  [K in keyof CommandMap<unknown>]: CommandMap<unknown>[K] extends (...args: infer Args) => unknown ? (...args: Args) => ChainedCommands : never;
} & {
  /** @param command - Curried command body sharing the pending draft. @returns Pending chain. */
  command(command: Command): ChainedCommands;
  /** @returns Whether the entire chain was applicable and accepted. */
  run(): boolean;
};

/** MSFE transaction builder; deliberately not a ProseMirror Transaction. */
export interface SourceTransaction {
  /** Current immutable draft after all preceding steps. */
  readonly state: EditorState;
  /** @param text - Exact text to insert at every selected range. @returns Whether accepted into the draft. */
  insertText(text: string): boolean;
  /** @param from - Inclusive source offset. @param to - Exclusive source offset. @param insert - Replacement text. @returns Validity. */
  replace(from: number, to: number, insert: string): boolean;
  /** @param anchor - Directed range start. @param head - Directed range end, default anchor. @returns Validity. */
  setSelection(anchor: number, head?: number): boolean;
  /** @param effect - Typed effect. @param value - Payload in the current draft coordinates. @returns Validity. */
  effect<T>(effect: Effect<T>, value: T): boolean;
  /** @param metadata - Typed token. @param value - Correlation value. @returns Validity. */
  setMeta<T>(metadata: Metadata<T>, value: T): boolean;
  /** Explicit backend escape hatch. @param spec - CodeMirror draft step. @returns Validity. */
  apply(spec: TransactionSpec): boolean;
}

/** Context of a pure author command. All nested commands share its transaction draft. */
export interface CommandProps {
  /** Current draft state; never the stale mounted state during a chain. */
  readonly state: EditorState;
  /** Source-native transaction builder. */
  readonly tr: SourceTransaction;
  /** Canonical editor; commands must use props.commands for nested mutations. */
  readonly editor: MsfeEditor;
  /** Nested commands apply to this same unpublished draft. */
  readonly commands: SingleCommands;
  /** Undefined during can; publication remains owned by the command manager. */
  readonly dispatch: (() => void) | undefined;
  /** @returns A nested atomic chain on this same draft. */
  chain(): ChainedCommands;
  /** @returns Pure queries starting at this draft, without changing it. */
  can(): SingleCommands;
}

/** Pure command body; return false to reject its complete draft. */
export type Command = (props: CommandProps) => boolean;
/** Erased names at the runtime installation boundary. */
export type AuthorCommandFactories = Readonly<Record<string, (...args: never[]) => Command>>;

/** Feature packages augment this interface with their named command signatures. */
export interface MsfeCommands<_Result> {}

/** Fluent planners share the same transaction and fail together. */
export type MsfeCommandChain = ChainedCommands;

/** Internal erased factory boundary; author packages retain their typed signatures. */
export type CommandFactories = Readonly<Record<string, (...args: never[]) => MsfeCommand>>;

/** Single authority supplied by the mounted editor. */
export interface CommandExecutor {
  /** @param commands - Atomic planners. @param target - Captured intent. @returns Accepted result. */
  run(commands: readonly MsfeCommand[], target?: MsfeTarget): MsfeResult;
  /** @param command - Pure planner. @param target - Captured intent. @returns Applicability. */
  can(command: MsfeCommand, target?: MsfeTarget): boolean;
}

/** Agent description of a source command; the AI core turns it into an editing operation. */
export interface MsfeCommandDescriptor {
  /** One-line description of what the command does. */
  readonly description: string;
  /** JSON Schema of the Agent parameters. */
  readonly params?: Readonly<Record<string, unknown>> | undefined;
  /** Target; default `document`. */
  readonly target?: "document" | "block" | "text" | "annotation" | undefined;
  /** Block kinds a block or text target must be. */
  readonly kinds?: readonly string[] | undefined;
  /** Parameter names counted from 1 by the Agent and from 0 by the command. */
  readonly ordinals?: readonly string[] | undefined;
  /** Side-effect class; `read` commands are not offered for editing. */
  readonly risk?: "read" | "write" | "policy" | undefined;
  /** Whether the command must be the only operation of its transaction. */
  readonly standalone?: boolean | undefined;
  /** Catalog group. */
  readonly category?: string | undefined;
  /**
   * @param params - Agent parameters.
   * @param context - Document facts of the target, as the AI core supplies them.
   * @returns The command's argument, or null when nothing in the document matches.
   */
  readonly adapt?: ((params: unknown, context: MsfeCommandAgentContext) => unknown) | undefined;
  /**
   * @param params - Agent parameters.
   * @param ports - Host resources.
   * @returns Prepared value handed to `adapt`.
   */
  readonly prepare?: ((params: unknown, ports: Readonly<Record<string, unknown>>) => Promise<unknown>) | undefined;
  /**
   * @param params - Agent parameters.
   * @param context - Document facts of the target.
   * @returns Whether the requested state is already in place.
   */
  readonly satisfied?: ((params: unknown, context: MsfeCommandAgentContext) => boolean) | undefined;
}

/** Document facts an Agent command adapter receives. */
export interface MsfeCommandAgentContext {
  /** Current document text. */
  readonly text: string;
  /** Range of the target block, or null. */
  readonly block: { readonly from: number; readonly to: number } | null;
  /** Where content inserted after the target block goes, after what earlier operations of the call put there; null without a block. */
  readonly after: number | null;
  /** Range the command acts on, or null for the document. */
  readonly range: { readonly from: number; readonly to: number } | null;
  /** Text of `range`, or null. */
  readonly selected: string | null;
  /** Identity the AI writes as, or null. */
  readonly author: { readonly id: string; readonly name: string } | null;
  /** Feature identity of the target annotation, or null. */
  readonly annotation: string | null;
  /** Result of `prepare`, when declared. */
  readonly prepared: unknown;
}
