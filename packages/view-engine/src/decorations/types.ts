import type {
  Decoration,
  DecorationAttrs,
  DecorationSource,
  EditorState
} from "@quirekit/pm";
import type {
  QuireDocumentRange,
  QuireRect,
  QuireViewTarget
} from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../editor-layout";

/** View facade shape needed to collect ProseMirror decoration props. */
export interface QuireDecorationSourceView {
  /** Current ProseMirror editor state exposed to decoration providers. */
  readonly state: EditorState;
  /**
   * Resolves a ProseMirror-style view prop.
   *
   * @param propName - Prop name to inspect.
   * @param f - Callback invoked for each defined prop value.
   * @returns Callback result or undefined.
   */
  someProp(propName: string, f: (value: unknown) => unknown): unknown;
}

/** Function shape accepted by the ProseMirror `decorations` view prop. */
export type QuireDecorationProvider = (
  state: EditorState
) => DecorationSource | null | undefined;

/** Decoration subset admitted by one renderer-neutral lane build. */
export type QuireDecorationCollectionScope = "all" | "persistent-content";

/** Text-decoration line kind supported by renderer-neutral decoration styles. */
export type QuireDecorationLineKind = "underline" | "strikethrough" | "overline";

/** Stroke style used by renderer-neutral text-decoration commands. */
export type QuireDecorationLineStyle =
  | "solid"
  | "double"
  | "wavy"
  | "dashed"
  | "dotted";

/** Stroke style supported by renderer-neutral decoration outlines. */
export type QuireDecorationOutlineStyle = "solid" | "dashed" | "dotted";

/** Metric-affecting font hints intentionally detected but not painted yet. */
export interface QuireDecorationFontHints {
  /** Font family requested by the decoration. */
  readonly fontFamily?: string | undefined;
  /** Font size requested by the decoration. */
  readonly fontSize?: string | undefined;
  /** Font weight requested by the decoration. */
  readonly fontWeight?: string | undefined;
  /** Font style requested by the decoration. */
  readonly fontStyle?: string | undefined;
}

/** One renderer-neutral text-decoration line. */
export interface QuireDecorationLine {
  /** Uses the fragment-owned underline pattern; transient review lines leave this unset. */
  readonly nativeUnderline?: boolean;
  /** Decoration line position relative to the text box. */
  readonly kind: QuireDecorationLineKind;
  /** Stroke color used to paint the line. */
  readonly color: string;
  /** Stroke width in canvas coordinate space. */
  readonly width: number;
  /** Optional line style. */
  readonly style?: QuireDecorationLineStyle | undefined;
  /** Last-mile paint surface; authored mark lines default to document content. */
  readonly paintSurface?: "content" | "overlay" | undefined;
}

/** Physical page-body side used by a renderer-neutral gutter marker. */
export type QuireDecorationGutterMarkerSide = "start" | "end";

/** Metric-neutral marker requested beside one page-body edge. */
export interface QuireDecorationGutterMarkerStyle {
  /** Stroke and author-token color. */
  readonly color: string;
  /** Marker stroke width in renderer coordinates. */
  readonly width: number;
  /** Page-body side that owns the marker. */
  readonly side: QuireDecorationGutterMarkerSide;
  /** Distance from the selected page-body edge in renderer coordinates. */
  readonly offset: number;
  /** Square author-token size in renderer coordinates. */
  readonly tokenSize: number;
}

/** Gutter marker request attached to one exact inline visual. */
export interface QuireDecorationGutterMarkerRequest
  extends QuireDecorationGutterMarkerStyle {
  /** Stable semantic owner used to coalesce one logical annotation per page. */
  readonly ownerId: string;
}

/** One metric-neutral marker painted at the final physical range edge. */
export interface QuireDecorationEndIndicator {
  /** Stroke color used by every fixed-layout backend. */
  readonly color: string;
  /** Stroke width in canvas coordinate space. */
  readonly width: number;
  /** Requested marker length, clamped inside the final fragment. */
  readonly length: number;
}

/**
 * Shape of one zero-width marker. The speech bubble sits beside an interactive
 * anchor; the boundary shapes mark a range edge or an empty range at the caret.
 */
export type QuireDecorationPointMarkerShape =
  | "speech-bubble"
  | "open-bracket"
  | "close-bracket"
  | "insertion-bar";

/** Metric-neutral marker painted beside one zero-width document anchor. */
export interface QuireDecorationPointMarker {
  /** Painted outline; the speech bubble when absent. */
  readonly shape?: QuireDecorationPointMarkerShape | undefined;
  /** Stroke color used by every fixed-layout backend. */
  readonly color: string;
  /** Square marker size in renderer coordinates. */
  readonly size: number;
  /** Marker outline width in renderer coordinates. */
  readonly lineWidth: number;
}

/** Renderer-neutral resolved paint style for a decoration. */
export interface QuireResolvedDecorationStyle {
  /** CSS cursor shown when the mounted pointer is over this decoration. */
  readonly cursor?: string | undefined;
  /** Background fill painted behind glyphs or node boxes. */
  readonly background?: string | undefined;
  /** Bottom keyline painted as a field cue without enclosing the whole range. */
  readonly keyline?:
    | {
        /** Keyline stroke color. */
        readonly color: string;
        /** Keyline stroke width in canvas coordinate space. */
        readonly width: number;
      }
    | undefined;
  /** Marker requested only at the final coalesced physical range fragment. */
  readonly endIndicator?: QuireDecorationEndIndicator | undefined;
  /** Marker requested beside one zero-width widget anchor. */
  readonly pointMarker?: QuireDecorationPointMarker | undefined;
  /** Text fill applied to glyphs in range. */
  readonly textColor?: string | undefined;
  /** Text-decoration lines painted over the range. */
  readonly textDecoration?: readonly QuireDecorationLine[] | undefined;
  /** Optional page-body-side gutter marker requested by this decoration. */
  readonly gutterMarker?: QuireDecorationGutterMarkerStyle | undefined;
  /** Node or inline-background decoration outline style. */
  readonly outline?:
    | {
        /** Outline stroke color. */
        readonly color: string;
        /** Outline stroke width in canvas coordinate space. */
        readonly width: number;
        /** Outline stroke pattern shared by Canvas, SVG, and HTML. */
        readonly style?: QuireDecorationOutlineStyle | undefined;
      }
    | undefined;
  /** Metric-affecting hints detected but not applied by paint-phase decorations. */
  readonly fontHints?: QuireDecorationFontHints | undefined;
}

/** Registered class token map used instead of a CSS cascade. */
export type QuireDecorationThemeRegistry = ReadonlyMap<
  string,
  Partial<QuireResolvedDecorationStyle>
>;

/** Diagnostic kind emitted during decoration resolution. */
export type QuireDecorationDiagnosticKind =
  | "unresolved-class"
  | "metric-affecting-style";

/** Non-fatal diagnostic emitted by decoration lane construction. */
export interface QuireDecorationDiagnostic {
  /** Diagnostic kind. */
  readonly kind: QuireDecorationDiagnosticKind;
  /** Stable decoration id involved in the diagnostic. */
  readonly decorationId: string;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Optional class name that could not be resolved. */
  readonly className?: string | undefined;
  /** Optional decoration range involved in the diagnostic. */
  readonly range?: QuireDocumentRange | undefined;
}

/** Renderer-neutral background rectangle resolved from an inline or node decoration. */
export interface QuireDecorationRectVisual {
  /** Stable visual id within one decoration lane. */
  readonly id: string;
  /** Source decoration id used for diagnostics and hit-test metadata. */
  readonly decorationId: string;
  /** Document range represented by this visual. */
  readonly range: QuireDocumentRange;
  /** Rectangle to paint in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Decoration attributes retained for diagnostics and style resolution. */
  readonly attrs: DecorationAttrs;
  /** Optional mounted-surface cursor associated with this exact rectangle. */
  readonly cursor?: string | undefined;
  /** Optional background fill style; display-list defaults when omitted. */
  readonly background?: string | undefined;
  /** Optional bottom keyline that preserves an open, document-like field shape. */
  readonly keyline?:
    | {
        /** Keyline stroke color. */
        readonly color: string;
        /** Keyline stroke width in canvas coordinate space. */
        readonly width: number;
      }
    | undefined;
  /** Optional marker painted only at this final physical range edge. */
  readonly endIndicator?: QuireDecorationEndIndicator | undefined;
  /** Optional gutter-marker request retained with exact laid-out geometry. */
  readonly gutterMarker?: QuireDecorationGutterMarkerRequest | undefined;
  /** Optional outline painted around this exact per-line rectangle. */
  readonly outline?:
    | {
        /** Outline stroke color. */
        readonly color: string;
        /** Outline stroke width in canvas coordinate space. */
        readonly width: number;
        /** Outline stroke pattern shared by Canvas, SVG, and HTML. */
        readonly style?: QuireDecorationOutlineStyle | undefined;
      }
    | undefined;
}

/** One page-resolved gutter marker shared by all fragments of a logical owner. */
export interface QuireDecorationGutterVisual {
  /** Stable visual identity within one decoration lane. */
  readonly id: string;
  /** Source decoration identity used by retained annotation ownership. */
  readonly decorationId: string;
  /** Stable semantic annotation owner. */
  readonly ownerId: string;
  /** Complete document range represented on this page. */
  readonly range: QuireDocumentRange;
  /** Exact marker stroke bounds in document-space renderer coordinates. */
  readonly rect: QuireRect;
  /** Stroke and author-token color. */
  readonly color: string;
  /** Marker stroke width. */
  readonly lineWidth: number;
  /** Page-body side that owns the marker. */
  readonly side: QuireDecorationGutterMarkerSide;
  /** Square author-token size. */
  readonly tokenSize: number;
  /** Zero-based page index that owns the marker. */
  readonly pageIndex: number;
}

/** Renderer-neutral point-marker visual resolved from a zero-width decoration. */
export interface QuireDecorationPointVisual {
  /** Stable visual id within one decoration lane. */
  readonly id: string;
  /** Source decoration id used for diagnostics and hit-test metadata. */
  readonly decorationId: string;
  /** Exact zero-width document range represented by the marker. */
  readonly range: QuireDocumentRange;
  /** Marker paint rectangle in renderer coordinates. */
  readonly rect: QuireRect;
  /** Painted outline; the speech bubble when absent. */
  readonly shape?: QuireDecorationPointMarkerShape | undefined;
  /** Marker stroke color. */
  readonly color: string;
  /** Marker outline width. */
  readonly lineWidth: number;
}

/** Per-range inline text style span consumed by text command generation. */
export interface QuireDecorationTextSpan {
  /** Stable span id within one decoration lane. */
  readonly id: string;
  /** Source decoration id used for diagnostics and hit-test metadata. */
  readonly decorationId: string;
  /** Document range represented by this span. */
  readonly range: QuireDocumentRange;
  /** Optional glyph fill style applied to this span. */
  readonly textColor?: string | undefined;
  /** Whether a persistent semantic visual replaces glyph paint in this span. */
  readonly suppressTextPaint?: boolean | undefined;
  /** Optional text-decoration lines painted for this span. */
  readonly textDecoration?: readonly QuireDecorationLine[] | undefined;
}

/** Renderer-neutral node decoration visual. */
export interface QuireDecorationNodeVisual {
  /** Stable visual id within one decoration lane. */
  readonly id: string;
  /** Source decoration id used for diagnostics and hit-test metadata. */
  readonly decorationId: string;
  /** Document range represented by this visual. */
  readonly range: QuireDocumentRange;
  /** Rectangle to paint in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Decoration attributes retained for diagnostics and style resolution. */
  readonly attrs: DecorationAttrs;
  /** Optional background fill style. */
  readonly background?: string | undefined;
  /** Optional outline style; display-list defaults when omitted. */
  readonly outline?:
    | {
        /** Outline stroke color. */
        readonly color: string;
        /** Outline stroke width in canvas coordinate space. */
        readonly width: number;
        /** Outline stroke pattern shared by Canvas, SVG, and HTML. */
        readonly style?: QuireDecorationOutlineStyle | undefined;
      }
    | undefined;
}

/** Renderer-neutral widget decoration descriptor. */
export interface QuireDecorationWidget {
  /** Stable widget id within one decoration lane. */
  readonly id: string;
  /** Source decoration id used for diagnostics and hit-test metadata. */
  readonly decorationId: string;
  /** Document range represented by the widget anchor. */
  readonly range: QuireDocumentRange;
  /** Anchor rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Original ProseMirror decoration. */
  readonly decoration: Decoration;
  /** Side ordering hint from the ProseMirror widget spec. */
  readonly side: number;
  /** Interaction target routed through qkView widget event infrastructure. */
  readonly target: QuireViewTarget;
}

/** View-only configuration for nonprinting character hints. */
export interface QuireInvisibleCharactersConfig {
  /** Current visibility; a getter lets a mounted host update without remounting. */
  readonly visible: boolean | (() => boolean);
  /** Resolved host theme token for secondary character hints. */
  readonly color: string;
  /** Host theme opacity for unobtrusive editing hints; defaults to fully opaque. */
  readonly opacity?: number | undefined;
  /** Localized name drawn at authored page boundaries. */
  readonly pageBreakLabel?: string | undefined;
  /** Localized name drawn at authored column boundaries. */
  readonly columnBreakLabel?: string | undefined;
}

/** One nonprinting hint positioned from accepted text caret geometry. */
export interface QuireInvisibleCharacterVisual {
  /** Stable source occurrence identity in the annotation owner graph. */
  readonly decorationId: string;
  /** Canonical source position; paragraph marks use a collapsed end range. */
  readonly range: QuireDocumentRange;
  /** Document-space paint bounds, without layout participation. */
  readonly rect: QuireRect;
  /** Resolved baseline in document coordinates. */
  readonly baseline: number;
  /** Glyph or localized page-break label. */
  readonly text: string;
  /** Font used only to paint the hint. */
  readonly font: string;
  /** Host theme paint token. */
  readonly color: string;
  /** Resolved editing-hint opacity, independent of document text paint. */
  readonly opacity: number;
  /** Whether this hint also draws a dotted page boundary. */
  readonly pageBreak: boolean;
}

/** Decoration lanes consumed by display-list generation and mounted runtimes. */
export interface QuireDecorationLanes {
  /** Nonprinting character hints excluded from persistent-content exports. */
  readonly invisibleCharacters?: readonly QuireInvisibleCharacterVisual[] | undefined;
  /** Typed retained targets projected independently from decoration paint. */
  readonly interactionTargets: readonly QuireViewTarget[];
  /** Background highlight rectangles painted before text. */
  readonly backgrounds: readonly QuireDecorationRectVisual[];
  /** Inline text paint spans applied while generating text commands. */
  readonly textStyles: readonly QuireDecorationTextSpan[];
  /** Node decoration boxes painted around layout nodes. */
  readonly nodes: readonly QuireDecorationNodeVisual[];
  /** Zero-width point markers painted without materializing a DOM widget. */
  readonly pointMarkers: readonly QuireDecorationPointVisual[];
  /** Page-gutter markers derived from exact inline range geometry. */
  readonly gutterMarkers?: readonly QuireDecorationGutterVisual[] | undefined;
  /** Widget decorations routed to DOM overlay and qkView targets. */
  readonly widgets: readonly QuireDecorationWidget[];
  /** Non-fatal diagnostics collected while resolving the lanes. */
  readonly diagnostics: readonly QuireDecorationDiagnostic[];
}

/** Options used to build the renderer-neutral decoration lane. */
export interface QuireDecorationLaneOptions {
  /** Optional editing-only formatting hints. */
  readonly invisibleCharacters?: QuireInvisibleCharactersConfig | undefined;
  /** Realized paint viewport bounds used to bound character enumeration. */
  readonly clipRects?: readonly QuireRect[] | undefined;
  /** View whose direct and plugin props supply DecorationSource values. */
  readonly view?: QuireDecorationSourceView | undefined;
  /** Layout snapshot used to map decorations to geometry. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Optional class-token registry used to resolve decoration class attributes. */
  readonly theme?: QuireDecorationThemeRegistry | undefined;
  /** Decoration subset admitted by this lane build. Defaults to all. */
  readonly scope?: QuireDecorationCollectionScope | undefined;
  /** Engine-owned decorations positioned in the snapshot state, appended after view decorations. */
  readonly frameDecorations?: readonly Decoration[] | undefined;
}
