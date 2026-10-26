import type { SuggestionResult } from "@quirekit/editor-ui";
import type { ClassicEditorLocale, ClassicEditorText } from "../base";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionReason
} from "../contributions/action-catalog";
import type { ClassicEditorRenderContext } from "../context";

/** Stable information-architecture groups shared by every Insert surface. */
export type ClassicEditorInsertGroupId =
  | "inline"
  | "structure"
  | "media"
  | "control";

/** Capability disposition presented without pretending unsupported work is executable. */
export type ClassicEditorInsertCapabilityMode =
  | "available"
  | "constrained"
  | "preserved-readonly"
  | "host-missing"
  | "unsupported"
  | "hidden";

/** Preferred visual density for one Insert discovery item. */
export type ClassicEditorInsertItemPresentation = "list" | "gallery";

/** Product capability facts resolved independently from command applicability. */
export interface ClassicEditorInsertCapability {
  /** Whether the capability is executable, constrained, preserved, missing, unsupported, or hidden. */
  readonly mode: ClassicEditorInsertCapabilityMode;
  /** Stable explanation for visible non-executable or constrained capability state. */
  readonly reason?: ClassicEditorActionReason | undefined;
}

/** One feature-owned typed action projected into the shared Insert catalog. */
export interface ClassicEditorInsertItemDefinition {
  /** Stable discovery identity; it never dispatches an action by string. */
  readonly id: string;
  /** Semantic Insert group owning this item. */
  readonly group: ClassicEditorInsertGroupId;
  /** Canonical typed action retained and executed directly by the catalog. */
  readonly action: ClassicEditorActionDefinition;
  /** Optional localized description explaining the created result. */
  readonly description?: ClassicEditorText | undefined;
  /** Optional localized aliases used only for catalog filtering. */
  readonly keywords?: readonly ClassicEditorText[] | undefined;
  /** Optional visual treatment for feature presets and recognizable object families. */
  readonly presentation?: ClassicEditorInsertItemPresentation | undefined;
  /** Optional feature-owned preview token rendered as text, never executable HTML. */
  readonly preview?: ClassicEditorText | undefined;
  /** Resolves Host and preservation capability without mutating the editor. */
  readonly capability?: ((
    context: ClassicEditorRenderContext
  ) => ClassicEditorInsertCapability) | undefined;
}

/** Localized, immutable item facts consumed by Insert presenters. */
export interface ResolvedClassicEditorInsertItem {
  /** Original feature-owned definition retaining the canonical action closure. */
  readonly definition: ClassicEditorInsertItemDefinition;
  /** Localized visible label. */
  readonly label: string;
  /** Localized optional supporting copy. */
  readonly description: string | null;
  /** Localized optional preview token. */
  readonly preview: string | null;
  /** Resolved capability disposition. */
  readonly capability: ClassicEditorInsertCapabilityMode;
  /** Whether the canonical action can execute against the current context. */
  readonly canExecute: boolean;
  /** Whether the canonical action is active for the current context. */
  readonly active: boolean;
  /** Localized reason for a visible disabled or constrained item. */
  readonly reason: string | null;
}

/** Immutable Insert group metadata used by wide and narrow presenters. */
export interface ClassicEditorInsertGroupDefinition {
  /** Stable group identity. */
  readonly id: ClassicEditorInsertGroupId;
  /** Localized group label. */
  readonly label: ClassicEditorText;
  /** Localized task-oriented group description. */
  readonly description: ClassicEditorText;
  /** Stable presentation order. */
  readonly order: number;
}

/** Inputs used to adapt a command-neutral Suggestion result into Insert discovery. */
export interface ClassicEditorInsertSuggestionProjection {
  /** Semantic Insert group receiving the suggestion fact. */
  readonly group: ClassicEditorInsertGroupId;
  /** Optional supporting copy not owned by SuggestionController. */
  readonly description?: ClassicEditorText | undefined;
  /** Optional visual treatment. */
  readonly presentation?: ClassicEditorInsertItemPresentation | undefined;
  /** Optional feature-owned preview token. */
  readonly preview?: ClassicEditorText | undefined;
  /** Optional capability resolver. */
  readonly capability?: ClassicEditorInsertItemDefinition["capability"];
}

/** Public configuration for one typed, extensible Insert catalog. */
export interface ClassicEditorInsertCatalogOptions {
  /** Feature-owned typed actions and suggestion projections. */
  readonly items: readonly ClassicEditorInsertItemDefinition[];
  /** Maximum successful items retained per mounted editor instance. */
  readonly recentLimit?: number | undefined;
}

/** Inputs for creating one item from existing SuggestionController facts. */
export interface ClassicEditorInsertSuggestionItemInput {
  /** Provider-owned result whose action is already a canonical Classic action. */
  readonly result: SuggestionResult<ClassicEditorActionDefinition>;
  /** Insert-specific discovery metadata. */
  readonly projection: ClassicEditorInsertSuggestionProjection;
}

/** Current locale and query used by catalog filtering. */
export interface ClassicEditorInsertQuery {
  /** Product locale controlling visible copy and case folding. */
  readonly locale: ClassicEditorLocale;
  /** Committed search query; IME preedit text must not enter this value. */
  readonly value: string;
  /** Optional group restriction used by narrow drill-in navigation. */
  readonly group?: ClassicEditorInsertGroupId | undefined;
}
