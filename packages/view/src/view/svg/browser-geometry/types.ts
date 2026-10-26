import type { QuireTextPaintCommand } from "@quirekit/renderer";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import type {
  QuireDisplayListStyles,
  QuireSurfaceConfig
} from "@quirekit/view-engine";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireHitTestResult,
  QuireInteractionRectAtPositionResult,
  QuireSelectionGeometry,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type { QuireViewCoordsAtPosResult } from "../../shared";
import type { QuireViewRenderResult, QuireViewTraceSink } from "../../types";

/** Retained hit context that SVG browser measurement can refine but must not create. */
export interface SvgBrowserMeasurementHitContext {
  /** Client point after SVG browser-measurement horizontal surface clamping. */
  readonly clientPoint: QuireClientPoint;
  /** Document-space point resolved by the canonical coordinate authority. */
  readonly documentPoint: QuirePoint;
  /** Retained nearest-caret hit produced by shared interaction geometry. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Options used to resolve SVG browser-measurement retained hit context facts. */
export interface SvgBrowserMeasurementHitContextOptions {
  /** Interaction geometry snapshot produced by the current render pass. */
  readonly geometrySnapshot: QuireViewRenderResult["interactionSnapshot"];
  /** Browser client point to resolve. */
  readonly clientPoint: QuireClientPoint;
  /** Mounted coordinate surface client rectangle. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds represented by the coordinate surface. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Browser-measured text offset hit inside one SVG text node. */
export interface SvgTextOffsetHit {
  /** Text offset nearest to the tested point. */
  readonly offset: number;
  /** Whether the chosen boundary sits after the measured character. */
  readonly afterCharacter: boolean;
  /** Horizontal distance from the tested point to the chosen boundary. */
  readonly distanceX: number;
}

/** Text measurement read from one rendered SVG text node. */
export interface SvgTextMeasurement {
  /** SVG root that owns the measured text node. */
  readonly root: SVGSVGElement;
  /** Display command that produced the SVG text node. */
  readonly command: QuireTextPaintCommand;
  /** Browser-measured full rendered text width resolver. */
  readonly resolveTextLength: () => number | null;
  /** Browser-measured rendered substring width resolver. */
  readonly resolveSubStringLength: (offset: number, length: number) => number | null;
  /** Browser-measured caret x coordinate resolver for this rendered text node. */
  readonly resolveXAtOffset: (offset: number) => number | null;
  /** Browser-measured hit-test resolver for an SVG-root-space point. */
  readonly resolveOffsetAtPoint: (point: QuirePoint) => SvgTextOffsetHit | null;
  /** Browser-measured visual selection rectangles for a text range inside this node. */
  readonly resolveRangeRects: (
    fromOffset: number,
    toOffset: number
  ) => readonly QuireRect[] | null;
}

/** Summary produced by a diagnostic SVG browser width probe. */
export interface SvgBrowserTextWidthProbeReport {
  /** Number of rendered SVG text nodes visited by the probe. */
  readonly textNodeCount: number;
  /** Number of UTF-16 code units covered by visited text nodes. */
  readonly characterCount: number;
  /** Number of full text width reads attempted. */
  readonly textLengthReads: number;
  /** Number of substring width reads attempted. */
  readonly subStringLengthReads: number;
}

/** Options used to create an SVG geometry provider. */
export interface CreateSvgGeometryProviderOptions {
  /** Render result whose content has already been painted into SVG text nodes. */
  readonly renderResult: QuireViewRenderResult;
  /** SVG roots containing rendered text nodes to measure. */
  readonly textRoots: readonly SVGSVGElement[];
  /** Optional sink receiving browser-measure phase timings. */
  readonly trace?: QuireViewTraceSink | undefined;
}

/** Options used to resolve selection geometry from an existing SVG provider. */
export interface SvgGeometryProviderSelectionOptions {
  /** Render result whose current editor selection should be measured. */
  readonly renderResult?: QuireViewRenderResult | undefined;
  /** Optional sink receiving browser-measure phase timings for this selection read. */
  readonly trace?: QuireViewTraceSink | undefined;
}

/** Options used to hit-test through a created SVG geometry provider. */
export interface SvgGeometryProviderHitTestOptions {
  /** Browser client point being tested. */
  readonly clientPoint: QuireClientPoint;
  /** Document-space point already resolved by the canonical coordinate authority. */
  readonly retainedDocumentPoint: QuirePoint;
  /** Retained hit-test answer produced by shared interaction geometry. */
  readonly retainedHitTestResult: QuireHitTestResult;
  /** Client rectangle of the mounted SVG coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds represented by the coordinate surface. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Options used to resolve coordinates through a created SVG geometry provider. */
export interface SvgGeometryProviderCoordsAtPosOptions {
  /** Document position to map into client coordinates. */
  readonly pos: number;
  /** Side preference when the position sits between two measured text nodes. */
  readonly side?: number | undefined;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Retained coordsAtPos answer produced by shared interaction geometry. */
  readonly retainedRectAtPosition: QuireInteractionRectAtPositionResult;
  /** Client rectangle of the mounted SVG coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds represented by the coordinate surface. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Browser-measured geometry provider for one rendered SVG frame set. */
export interface SvgGeometryProvider {
  /** Measurements collected from rendered SVG text nodes. */
  readonly measurements: readonly SvgTextMeasurement[];
  /**
   * Resolves current editor selection geometry from rendered SVG text.
   *
   * @param options - Optional render result and trace override for this read.
   * @returns SVG-measured selection geometry, or the retained geometry.
   */
  resolveSelectionGeometry(
    options?: SvgGeometryProviderSelectionOptions
  ): QuireSelectionGeometry;
  /**
   * Hit-tests a client point against rendered SVG text.
   *
   * @param options - Client point and coordinate projection inputs.
   * @returns Browser-measured text hit, or the retained hit.
   */
  hitTest(options: SvgGeometryProviderHitTestOptions): QuireHitTestResult;
  /**
   * Refines a retained document-position rectangle with browser measurements.
   *
   * @param options - Document position, retained geometry, and projection inputs.
   * @returns Browser-measured client rectangle scoped by shared retained geometry.
   */
  refineCoordsAtPos(
    options: SvgGeometryProviderCoordsAtPosOptions
  ): QuireViewCoordsAtPosResult;
  /**
   * Runs optional browser-native width reads for diagnostics.
   *
   * @returns Summary of browser-native width reads performed by this probe.
   */
  runWidthProbe(): SvgBrowserTextWidthProbeReport;
}

/** Options used to rebuild SVG geometry from rendered browser text. */
export interface CreateSvgBrowserMeasuredRenderResultOptions
  extends CreateSvgGeometryProviderOptions {
  /** Optional already-collected provider to reuse for this render result. */
  readonly geometryProvider?: SvgGeometryProvider | undefined;
  /** Whether to keep the render result's existing selection geometry. */
  readonly preserveSelectionGeometry?: boolean | undefined;
  /** Whether to run diagnostic browser-native width reads on visible SVG text. */
  readonly browserMeasureProbe?: boolean | undefined;
  /** Optional display-list style overrides used to rebuild overlay commands. */
  readonly styles?: Partial<QuireDisplayListStyles> | undefined;
  /** Optional semantic surface styling used to rebuild overlay commands. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Whether overlay caret commands should be omitted. */
  readonly omitCaretCommands?: boolean | undefined;
}
