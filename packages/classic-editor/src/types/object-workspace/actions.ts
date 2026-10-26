import type { ClassicEditorText } from "../base";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionReason,
  ClassicEditorActionState
} from "../contributions";

/** Typed color-picker recipe attached to one retained direct action. */
export interface ClassicEditorObjectColorControl {
  /** Closed control kind understood by the shared object Quick Bar. */
  readonly kind: "color";
  /** Stable DOM and diagnostics identity for this color control. */
  readonly id: string;
  /** Current normalized CSS color, or null for no fill. */
  readonly value: string | null;
  /** Whether the selected cells expose different fill values. */
  readonly mixed: boolean;
}

/** One action item rendered inside a compact object picker. */
export interface ClassicEditorObjectMenuControlItem {
  /** Exact retained direct action invoked by this item. */
  readonly action: ClassicEditorActionDefinition;
}

/** One visually separated section inside a compact object picker. */
export interface ClassicEditorObjectMenuControlGroup {
  /** Stable group identity used by DOM diagnostics. */
  readonly id: string;
  /** Optional localized group label. */
  readonly label?: ClassicEditorText | undefined;
  /** Icon-first direct actions retained by this group. */
  readonly items: readonly ClassicEditorObjectMenuControlItem[];
}

/** Typed icon-grid picker attached to one retained direct action family. */
export interface ClassicEditorObjectMenuControl {
  /** Closed control kind understood by the shared object Quick Bar. */
  readonly kind: "menu";
  /** Stable DOM and diagnostics identity for this picker. */
  readonly id: string;
  /** Localized trigger and surface label. */
  readonly label: ClassicEditorText;
  /** Compact trigger icon. */
  readonly icon: string;
  /** Whether the selected objects expose incompatible current values. */
  readonly mixed: boolean;
  /** Ordered picker sections containing exact direct action objects. */
  readonly groups: readonly ClassicEditorObjectMenuControlGroup[];
}

/** Closed object-control recipes supported by the shared Quick Bar. */
export type ClassicEditorObjectActionControl =
  | ClassicEditorObjectColorControl
  | ClassicEditorObjectMenuControl;

/** Per-object presentation facts attached to one canonical direct action. */
export interface ClassicEditorObjectActionContribution {
  /** Direct retained action definition; ids are never executable lookups. */
  readonly action: ClassicEditorActionDefinition;
  /** Owner rank used by the wide 4–7 action recipe. */
  readonly rank: number;
  /** Whether the action may appear outside the More menu. */
  readonly prominence: "primary" | "secondary" | "overflow";
  /** Additional object-state facts that do not duplicate command eligibility. */
  readonly presentation?: (() => ClassicEditorObjectActionPresentation) | undefined;
  /** Optional typed control rendered in place of a plain action button. */
  readonly control?: ClassicEditorObjectActionControl | undefined;
}

/** Object-specific state supplement for a direct action. */
export interface ClassicEditorObjectActionPresentation {
  /** Whether an owned asynchronous operation is in progress. */
  readonly busy?: boolean | undefined;
  /** Whether the selected objects expose multiple values. */
  readonly mixed?: boolean | undefined;
  /** Optional reason overriding command-state fallback presentation. */
  readonly reason?: ClassicEditorActionReason | null | undefined;
}

/** One immutable direct-action projection consumed by every object surface. */
export interface ClassicEditorObjectActionProjection {
  /** Exact action object that must be passed back for execution. */
  readonly action: ClassicEditorActionDefinition;
  /** Canonical command availability, active state, and reason. */
  readonly state: ClassicEditorActionState;
  /** Whether the action is performing an owned asynchronous task. */
  readonly busy: boolean;
  /** Whether the action summarizes mixed values. */
  readonly mixed: boolean;
  /** Final visible reason for disabled, busy, locked, or stale state. */
  readonly reason: ClassicEditorActionReason | null;
  /** Optional typed control retained unchanged from the owner contribution. */
  readonly control: ClassicEditorObjectActionControl | null;
}

/** Direct actions partitioned for one responsive object surface. */
export interface ClassicEditorObjectActionSurfaceProjection {
  /** High-frequency actions visible without opening More. */
  readonly primary: readonly ClassicEditorObjectActionProjection[];
  /** Remaining available actions shown in the More menu or Sheet. */
  readonly overflow: readonly ClassicEditorObjectActionProjection[];
}
