import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionReason
} from "../contributions";
import type { ClassicEditorText } from "../base";

/** Closed field recipes understood by the shared object Inspector. */
export type ClassicEditorObjectInspectorFieldKind =
  | "text"
  | "number"
  | "choice"
  | "color"
  | "toggle";

/** Choice offered by a generic Inspector field. */
export interface ClassicEditorObjectInspectorChoice {
  /** Stable semantic value passed to the field's direct commit action. */
  readonly value: string;
  /** Localizable visible option label. */
  readonly label: ClassicEditorText;
}

/** Generic field contribution rendered by the shared Inspector chrome. */
export interface ClassicEditorObjectInspectorField {
  /** Stable field identity used only for labels and diagnostics. */
  readonly id: string;
  /** Localizable field label. */
  readonly label: ClassicEditorText;
  /** Shared visual/control recipe. */
  readonly kind: ClassicEditorObjectInspectorFieldKind;
  /** Current scalar value, or null for a mixed/unset value. */
  readonly value: string | number | boolean | null;
  /** Whether the selected targets expose multiple values. */
  readonly mixed: boolean;
  /** Optional localizable unit suffix. */
  readonly unit?: ClassicEditorText | undefined;
  /** Optional choices for the choice recipe. */
  readonly choices?: readonly ClassicEditorObjectInspectorChoice[] | undefined;
  /** Optional native numeric lower bound. */
  readonly min?: number | undefined;
  /** Optional native numeric upper bound. */
  readonly max?: number | undefined;
  /** Optional native numeric step. */
  readonly step?: number | undefined;
  /** Current validation or disabled explanation. */
  readonly validation?: ClassicEditorActionReason | null | undefined;
  /** Direct canonical action receiving the committed field payload. */
  readonly commit: ClassicEditorActionDefinition;
  /** Optional direct canonical action restoring the feature-owned default. */
  readonly reset?: ClassicEditorActionDefinition | undefined;
  /** Optional semantic label for the color picker's null/reset value. */
  readonly colorResetLabel?: ClassicEditorText | undefined;
}

/** Plugin-owned Inspector section projected into one shared tab. */
export interface ClassicEditorObjectInspectorSection {
  /** Stable section identity. */
  readonly id: string;
  /** Owning tab identity. */
  readonly tabId: string;
  /** Localizable section title. */
  readonly title: ClassicEditorText;
  /** Optional localizable status badge. */
  readonly status?: ClassicEditorText | undefined;
  /** Generic fields whose mutations remain direct feature actions. */
  readonly fields: readonly ClassicEditorObjectInspectorField[];
  /** Immediate feature actions that do not pretend to expose a persistent field value. */
  readonly actions?: readonly ClassicEditorActionDefinition[] | undefined;
  /** Optional feature-owned input passed unchanged to every immediate section action. */
  readonly actionInput?: unknown;
}

/** Inspector tab contributed for one selected object kind. */
export interface ClassicEditorObjectInspectorTab {
  /** Stable tab identity. */
  readonly id: string;
  /** Localizable visible label. */
  readonly label: ClassicEditorText;
  /** Stable owner order. */
  readonly order: number;
}

/** Inspector definition attached to one exact object target. */
export interface ClassicEditorObjectInspectorDefinition {
  /** Localizable Inspector title. */
  readonly title: ClassicEditorText;
  /** Plugin-owned tabs in owner-defined order. */
  readonly tabs: readonly ClassicEditorObjectInspectorTab[];
  /** Plugin-owned sections projected inside the single host. */
  readonly sections: readonly ClassicEditorObjectInspectorSection[];
}

/** Typed payload passed to a field's direct commit action. */
export interface ClassicEditorObjectInspectorCommitPayload {
  /** Stable field identity retained for diagnostics. */
  readonly fieldId: string;
  /** Scalar value already parsed by the shared control recipe. */
  readonly value: string | number | boolean | null;
}
