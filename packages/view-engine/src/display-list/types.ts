import type { QuireInvisibleCharactersConfig } from "../decorations";
import type { QuireSelectionGeometry } from "../interaction/types";
import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireDecorationLanes } from "../decorations";
import type { QuireDisplayCommandCache } from "./text";
import type {
  QuireDisplayCommand,
  QuireDisplayListLayers,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";

/** Measured display-list phase emitted for diagnostics. */
export interface QuireDisplayListMeasuredPhase {
  /** Stable phase name shown in diagnostics. */
  readonly name: string;
  /** Phase start time in milliseconds from the runtime clock. */
  readonly startedAt: number;
  /** Phase end time in milliseconds from the runtime clock. */
  readonly endedAt: number;
  /** Phase duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Receives one measured display-list build phase.
 *
 * @param phase - Phase timing emitted while building display commands.
 */
export type QuireDisplayListTraceSink = (phase: QuireDisplayListMeasuredPhase) => void;

/**
 * Receives each top-level display command as it is appended.
 *
 * @param command - Display command appended to the current list.
 */
export type QuireDisplayCommandObserver = (command: QuireDisplayCommand) => void;

/** Last-mile display-list surface used by mounted two-surface painters. */
export type QuireDisplayCommandPaintSurface = keyof QuireDisplayListLayers;

/** Exact retained paint responsibility declared by a command producer. */
export type QuireDisplayOwnerPaintScope =
  | "layout-content"
  | "sub-layout-content"
  | "page-chrome"
  | "layer-content"
  | "layer-overlay"
  | "selection-overlay"
  | "annotation-overlay";

/** Visual configuration for editor selection surfaces. */
export interface QuireSurfaceSelectionConfig {
  /** Fill style used for rendered selection ranges. */
  readonly fillStyle?: string | undefined;
}

/** Visual configuration for selected object outlines and manipulation handles. */
export interface QuireSurfaceObjectSelectionConfig {
  /** Stroke style used for the selected object boundary and rotation stem. */
  readonly outlineStrokeStyle?: string | undefined;
  /** Fill style used inside resize and rotation handles. */
  readonly handleFillStyle?: string | undefined;
  /** Stroke style used around resize and rotation handles. */
  readonly handleStrokeStyle?: string | undefined;
}

/** Visual configuration for transient IME preedit surfaces. */
export interface QuireSurfaceImeConfig {
  /** Fill style used behind IME preedit text when the background is enabled. */
  readonly preeditBackgroundFillStyle?: string | undefined;
  /** Whether IME preedit text should render a background highlight. */
  readonly preeditBackground?: boolean | undefined;
  /** Whether IME preedit text should render the standard underline affordance. */
  readonly preeditUnderline?: boolean | undefined;
}

/** Host-facing visual configuration for transient editor surfaces. */
export interface QuireSurfaceConfig {
  /** Nonprinting editing hints; never requested by export consumers. */
  readonly invisibleCharacters?: QuireInvisibleCharactersConfig | undefined;
  /** Selection surface styling. */
  readonly selection?: QuireSurfaceSelectionConfig | undefined;
  /** Selected object outline and direct-manipulation handle styling. */
  readonly objectSelection?: QuireSurfaceObjectSelectionConfig | undefined;
  /** IME preedit surface styling. */
  readonly ime?: QuireSurfaceImeConfig | undefined;
}

/** Style tokens used while deriving renderer-agnostic display commands. */
export interface QuireDisplayListStyles {
  /** Fill style assigned to the document background command. */
  readonly documentFillStyle: string;
  /** Fill style assigned to visible page backgrounds. */
  readonly pageFillStyle: string;
  /** Stroke style assigned to editor-only page body outlines. */
  readonly pageBodyStrokeStyle: string;
  /** Stroke width assigned to editor-only page body outlines. */
  readonly pageBodyStrokeWidth: number;
  /** Stroke style assigned to editor-only page body corner marks. */
  readonly pageBodyCornerStrokeStyle: string;
  /** Stroke width assigned to editor-only page body corner marks. */
  readonly pageBodyCornerStrokeWidth: number;
  /** Arm length assigned to editor-only page body corner marks. */
  readonly pageBodyCornerLength: number;
  /** Opacity assigned to inactive header and footer story content. */
  readonly inactiveAuxiliaryStoryOpacity: number;
  /** Opacity assigned to the editable body of checked task paragraphs. */
  readonly checkedTaskContentOpacity: number;
  /** Font token assigned to generated text commands. */
  readonly font: string;
  /** Fill style assigned to generated text commands. */
  readonly textFillStyle: string;
  /** Fill style assigned to generated selection highlight commands. */
  readonly selectionFillStyle: string;
  /** Fill style assigned to renderer-neutral decoration highlights. */
  readonly decorationFillStyle: string;
  /** Stroke style assigned to node decoration outlines. */
  readonly decorationStrokeStyle: string;
  /** Stroke width assigned to node decoration outlines. */
  readonly decorationLineWidth: number;
  /** Fill style assigned to transient IME preedit text backgrounds. */
  readonly imePreeditBackgroundFillStyle: string;
  /** Whether to draw a background behind IME preedit text. */
  readonly imePreeditBackground: boolean;
  /** Whether to underline IME preedit text using the standard affordance. */
  readonly imePreeditUnderline: boolean;
  /** Fill style assigned to generated caret commands. */
  readonly caretFillStyle: string;
  /** Vertical offset from a layout node top edge to the text baseline. */
  readonly textBaselineOffset: number;
}

/** Options used to build a canvas display list from layout data. */
export interface QuireDisplayListOptions {
  /** Layout snapshot that should be converted into display commands. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Auxiliary story source explicitly activated by mounted editing state. */
  readonly activeAuxiliaryStorySourceId?: string | undefined;
  /** Optional selection geometry to layer into the display list. */
  readonly selectionGeometry?: QuireSelectionGeometry;
  /** Optional document range occupied by IME preedit text in a speculative layout state. */
  readonly imePreeditRange?: QuireDocumentRange | undefined;
  /** Optional renderer-neutral decoration lane to layer into the display list. */
  readonly decorationLane?: QuireDecorationLanes;
  /** Optional style overrides for generated display commands. */
  readonly styles?: Partial<QuireDisplayListStyles>;
  /** Optional semantic surface styling for selection and IME affordances. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Optional cache for retained text fragment content commands. */
  readonly commandCache?: QuireDisplayCommandCache | undefined;
  /** Optional sink receiving measured display-list phases for diagnostics. */
  readonly trace?: QuireDisplayListTraceSink | undefined;
  /** Optional direct collector for commands owned by one retained paint product. */
  readonly ownerCommandCollector?: QuireDisplayListOwnerCommandCollector | undefined;
  /** Optional observer receiving commands during display-list construction. */
  readonly commandObserver?: QuireDisplayCommandObserver | undefined;
  /**
   * Whether to retain one composite document-space command list after observers
   * consume each build phase. Page-stack renders disable this when retained
   * chunks are the canonical command owners. Setting this to false requires a
   * command observer so commands always have an explicit owner.
   */
  readonly retainCompositeCommands?: boolean | undefined;
  /**
   * Optional document-space rectangles limiting expensive content command
   * generation. Background bounds stay document-sized; page chrome, selection,
   * caret, decoration, and text-fragment commands outside every clip are omitted.
   */
  readonly clipRects?: readonly QuireRect[] | undefined;
  /**
   * Skips caret command generation while keeping caret geometry. Used by the DOM
   * caret rendering mode so the overlay never paints a caret that the DOM caret
   * element already renders.
   */
  readonly omitCaretCommands?: boolean | undefined;
}

/** Commands emitted directly for one retained display owner. */
export interface QuireDisplayListOwnerCommandBatch {
  /** Stable product identity supplied by the command producer. */
  readonly productId: string;
  /** Exact paint responsibility supplied by the command producer. */
  readonly paintScope: QuireDisplayOwnerPaintScope;
  /** Producer-declared order within the target paint lane. */
  readonly paintOrder: number;
  /** Ordered commands emitted for this owner responsibility. */
  readonly commands: readonly QuireDisplayCommand[];
}

/** Direct sink receiving commands for retained display-owner responsibilities. */
export interface QuireDisplayListOwnerCommandCollector {
  /**
   * Appends commands emitted by one stable retained paint product.
   *
   * @param batch - Explicit product, paint scope, and ordered commands.
   * @returns Nothing.
   */
  readonly append: (batch: QuireDisplayListOwnerCommandBatch) => void;
}
