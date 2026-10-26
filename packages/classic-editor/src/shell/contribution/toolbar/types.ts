import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type {
  ClassicEditorRibbonItemContribution,
  ClassicEditorRibbonWidgetContribution,
  ClassicEditorToolbarContribution
} from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import type { ClassicEditorOverlayController } from "../../overlays/registry";

/** Executable control accepted by the Classic contribution registry. */
export type ClassicToolbarControl = Exclude<ClassicEditorRibbonItemContribution, ClassicEditorRibbonWidgetContribution>;

/** Latest entries produced by one retained feature factory. */
export interface ClassicToolbarFeature {
  /** Placement identity; separate placements retain independent feature lifecycle. */
  readonly key: string;
  /** Feature-owned callbacks, renderers and reactive context. */
  readonly configuration: ClassicEditorToolbarContribution;
  /** Current individual controls before shell namespacing. */
  readonly items: readonly QuireKitToolbarEntry[];
}

/** Shared adapter context supplied to the public Toolbar renderer. */
export interface ClassicToolbarContext {
  /** Live shell model; command execution always reads its current mounted context. */
  readonly model: Pick<ClassicEditorShellModel, "context" | "locale">;
  /** Live feature configurations indexed by stable placement. */
  readonly features: ReadonlyMap<string, ClassicToolbarFeature>;
  /** Instance-scoped ownership retained by action-only compound menus. */
  readonly menus: ReadonlyMap<string, ClassicEditorOverlayController>;
}

/** Private routing metadata; public Toolbar treats it as opaque host data. */
export type ClassicToolbarEntryMeta =
  | { readonly kind: "control"; readonly control: ClassicToolbarControl }
  | { readonly kind: "menu"; readonly groupId: string; readonly controls: readonly ClassicToolbarControl[] }
  | { readonly kind: "widget"; readonly contribution: ClassicEditorRibbonWidgetContribution }
  | { readonly kind: "feature"; readonly featureKey: string; readonly original: QuireKitToolbarEntry; readonly path: readonly string[] };
