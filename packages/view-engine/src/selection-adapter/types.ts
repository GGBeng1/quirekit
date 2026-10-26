import type {
  QuireSelectionAdapter,
  QuireSelectionAdapterRegistration
} from "@quirekit/core/selection-adapter";

export type {
  QuireSelectionAdapter,
  QuireSelectionAdapterCompileContext,
  QuireSelectionAdapterMode,
  QuireSelectionAdapterModes,
  QuireSelectionAdapterUnit
} from "@quirekit/core/selection-adapter";

/** Options applied to a typed Core registration envelope. */
export interface QuireSelectionAdapterRegistrationOptions {
  /** Optional precedence for overlapping node-type claims. */
  readonly priority?: number | undefined;
}

/** Typed registration returned by the legacy low-level helper. */
export type QuireTypedSelectionAdapterRegistration =
  QuireSelectionAdapterRegistration<QuireSelectionAdapter>;
