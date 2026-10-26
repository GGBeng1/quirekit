import type {
  CommandSpec,
  QuireEditorState,
  QuireExtensionThisContext
} from "@quirekit/core";
import type {
  EditorState,
  Selection,
  Transaction
} from "@quirekit/pm";

/** Format-painter activation state retained outside the document. */
export type QuireFormatPainterMode = "off" | "once" | "locked";

/** Formatting planes selected by the normalized target selection. */
export type QuireFormattingLevel = "character" | "paragraph";

/** Stable selection facts shared by all formatting providers. */
export interface QuireFormattingSelectionScope {
  /** Whether this target owns only character format or also paragraph format. */
  readonly level: QuireFormattingLevel;
  /** Inclusive selection start in the current document. */
  readonly from: number;
  /** Exclusive selection end in the current document. */
  readonly to: number;
  /** Whether the target is a collapsed caret. */
  readonly empty: boolean;
}

/** Read-only context used while capturing a provider-owned snapshot. */
export interface QuireFormattingCaptureContext {
  /** QuireKit state exposing extension-owned effective-style resolvers. */
  readonly editorState: QuireEditorState;
  /** Current ProseMirror state. */
  readonly state: EditorState;
  /** Current canonical selection. */
  readonly selection: Selection;
  /** Normalized character/paragraph ownership. */
  readonly scope: QuireFormattingSelectionScope;
}

/** Shared transaction context used while applying or clearing format. */
export interface QuireFormattingMutationContext {
  /** State from which the formatting transaction started. */
  readonly state: EditorState;
  /** Single root transaction shared by every provider. */
  readonly tr: Transaction;
  /** Normalized character/paragraph ownership. */
  readonly scope: QuireFormattingSelectionScope;
}

/** One owner-provided formatting plane. */
export interface QuireFormattingProvider {
  /** Globally unique provider identity. */
  readonly id: string;
  /** Stable provider ordering; lower values run first. */
  readonly order?: number | undefined;
  /**
   * Captures provider-owned state from the source selection.
   *
   * @param context - Source state and normalized selection.
   * @returns Private snapshot value, or undefined when this provider has no source.
   */
  readonly capture: (context: QuireFormattingCaptureContext) => unknown;
  /**
   * Applies one previously captured provider value.
   *
   * @param context - Shared target transaction.
   * @param value - Private value returned by this provider's capture function.
   * @returns Whether the provider changed document or stored formatting state.
   */
  readonly apply: (
    context: QuireFormattingMutationContext,
    value: unknown
  ) => boolean;
  /**
   * Clears provider-owned direct formatting from the target.
   *
   * @param context - Shared target transaction.
   * @returns Whether the provider changed document or stored formatting state.
   */
  readonly clear: (context: QuireFormattingMutationContext) => boolean;
}

/** Public, snapshot-safe view of the transient format-painter state. */
export interface QuireFormatPainterState {
  /** Current single-use, continuous, or inactive mode. */
  readonly mode: QuireFormatPainterMode;
  /** Whether a private provider snapshot is currently available. */
  readonly hasSnapshot: boolean;
}

/** Formatting behavior options shared by command and interaction surfaces. */
export interface FormattingOptions {
  /** Milliseconds in which a second press promotes single-use mode to continuous mode. */
  readonly doublePressDelay: number;
  /** Mark names preserved by character-format application and clearing. */
  readonly preservedMarks: readonly string[];
  /** textStyle attribute names preserved by character-format application and clearing. */
  readonly preservedTextStyleAttributes: readonly string[];
}

/** Formatting command methods installed by the shared behavior extension. */
export type FormattingCommandMethods<ReturnType> = {
  /** Captures reusable formatting without activating the painter. */
  copyFormatting: () => ReturnType;
  /** Applies the retained snapshot to the current selection without discarding it. */
  pasteFormatting: () => ReturnType;
  /** Enters, locks, or cancels format-painter mode. */
  toggleFormatPainter: () => ReturnType;
  /** Cancels format-painter mode while retaining formatting for explicit paste. */
  cancelFormatPainter: () => ReturnType;
  /** Clears all direct formatting owned by installed providers. */
  clearFormatting: () => ReturnType;
};

/** Complete command map installed by the formatting behavior extension. */
export type FormattingCommands = {
  /** Captures reusable formatting without activating the painter. */
  readonly copyFormatting: CommandSpec;
  /** Applies the retained snapshot to the current selection. */
  readonly pasteFormatting: CommandSpec;
  /** Enters, locks, or cancels format-painter mode. */
  readonly toggleFormatPainter: CommandSpec;
  /** Cancels format-painter mode. */
  readonly cancelFormatPainter: CommandSpec;
  /** Clears direct formatting owned by installed providers. */
  readonly clearFormatting: CommandSpec;
};

/** State shapes accepted by the public format-painter query. */
export type QuireFormattingStateSource = EditorState | QuireEditorState;

/** Factory installed on any extension kind that contributes formatting providers. */
export type QuireFormattingProviderFactory<
  Options extends object = object,
  Storage extends object = object
> = (
  this: QuireExtensionThisContext<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
) => readonly QuireFormattingProvider[];

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the shared formatting-tools extension. */
    readonly formatting: FormattingCommandMethods<ReturnType>;
  }

  interface QuireExtensionConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes provider-owned formatting capture, apply, and clear behavior. */
    readonly addFormattingProviders?: QuireFormattingProviderFactory<Options, Storage>;
  }

  interface QuireNodeConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes provider-owned formatting capture, apply, and clear behavior. */
    readonly addFormattingProviders?: QuireFormattingProviderFactory<Options, Storage>;
  }

  interface QuireMarkConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes provider-owned formatting capture, apply, and clear behavior. */
    readonly addFormattingProviders?: QuireFormattingProviderFactory<Options, Storage>;
  }
}
