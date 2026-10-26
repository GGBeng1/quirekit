import type { MountedPageStackFillBackend, MountedPageStackFillOptions } from "../../shared/page-stack/fill/types";
import type { QuireViewRenderResult, QuireViewTraceSink } from "../../types";
import type {
  QuirePageSurfacePaintValidityCache
} from "../../shared";
import type { SvgMountedViewRuntimeOptions } from "../types";

/** Current products needed when the viewport realizes a new SVG page frame. */
export interface SvgPageStackPresentationRenderState {
  /** Authoritative document-space render products. */
  readonly renderResult: QuireViewRenderResult;
  /** Whether overlay caret commands should be visible in realized frames. */
  readonly caretVisible: boolean;
}

/** Backend capabilities consumed by presentation-owned SVG page-stack fill. */
export type SvgPageStackPresentationFillOptions = Omit<MountedPageStackFillBackend, "executePass">;

/** Inputs used to assemble the SVG-specific fill lifecycle. */
export interface CreateSvgPageStackFillLifecycleOptions extends MountedPageStackFillOptions {
  /** Backend runtime policies and scheduling overrides. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
  /** Backend fill execution and reconciliation capabilities. */
  readonly fill: SvgPageStackPresentationFillOptions;
}

/** Construction contract for one mounted SVG page-stack presentation. */
export interface CreateSvgPageStackPresentationOptions {
  /** Mounted editor root used to create and measure SVG frame elements. */
  readonly root: HTMLElement;
  /** Continuous document surface used to resolve the scroll authority. */
  readonly documentSurface: HTMLElement;
  /** Element that owns sparse SVG page frames. */
  readonly host: HTMLElement;
  /** SVG runtime paint, measurement, and diagnostics policies. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
  /** Viewport-first fill capabilities owned by this presentation resource. */
  readonly fill: SvgPageStackPresentationFillOptions;
  /** Reads the latest accepted document products for viewport realization. */
  readonly readRenderState: () => SvgPageStackPresentationRenderState | null;
  /** Commits browser-measured geometry after viewport realization. */
  readonly commitRenderResult: (renderResult: QuireViewRenderResult) => void;
  /** Requests a document render when retained clip coverage is insufficient. */
  readonly requestDocumentRefresh: () => void;
}

/** Options for a full SVG frame paint and browser-measure pass. */
export interface SvgPageStackPresentationPaintOptions {
  /** Whether overlay caret commands should be visible. */
  readonly caretVisible: boolean;
  /** Whether existing selection geometry must survive transient IME measurement. */
  readonly preserveSelectionGeometry?: boolean | undefined;
  /** Optional phase trace sink. */
  readonly trace?: QuireViewTraceSink | undefined;
}

/** Inputs used to synchronize mounted SVG overlay surfaces. */
export interface PaintSvgPageStackFrameOverlaysOptions {
  /** Shared live-surface validity owned by the SVG presentation resource. */
  readonly validity: QuirePageSurfacePaintValidityCache<SVGSVGElement>;
  /** Optional phase trace sink for page-stack paint diagnostics. */
  readonly trace?: QuireViewTraceSink | undefined;
}
