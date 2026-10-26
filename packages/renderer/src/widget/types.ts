import type {
  QuireDisplayCommand,
  QuireDisplayCommandLayer,
  QuireDisplayList
} from "../core/display-list";
import type { QuireDocumentRange } from "../core/document";
import type { QuirePoint, QuireRect, QuireSize } from "../core/geometry";
import type { QuireLayoutDomOverlay } from "../core/overlay";
import type {
  QuireViewEventBinding,
  QuireViewEventBindingMap,
  QuireViewHost,
  QuireViewInteraction,
  QuireViewOwner,
  QuireViewTarget
} from "./events";

/** Direction used by flex-like widget primitives. */
export type QuireWidgetFlexDirection = "row" | "column";

/** Axis used by divider widget primitives. */
export type QuireWidgetDividerAxis = "horizontal" | "vertical";

/** Overflow behavior used by static paragraph preview widgets. */
export type QuireWidgetTextOverflow = "visible" | "clip" | "ellipsis";

/** White-space behavior used by static paragraph preview widgets. */
export type QuireWidgetWhiteSpace = "normal" | "nowrap";

/** Node kinds supported by the experimental Quire view widget tree. */
export type QuireViewNodeKind =
  | "box"
  | "text"
  | "paragraph-preview"
  | "flex"
  | "surface"
  | "overlay"
  | "positioned"
  | "padding"
  | "clip"
  | "spacer"
  | "divider"
  | "custom-paint"
  | "dom-overlay";

/** Measures text for the widget compiler without binding it to a backend. */
export type QuireWidgetTextMeasurer = (text: string, font: string) => QuireSize;

/** Runtime data exposed to widget callbacks during compilation. */
export interface QuireWidgetRuntimeContext {
  /** Host surface metadata supplied by the mounted or standalone runtime. */
  readonly host: QuireViewHost | undefined;
}

/** Paint callback used by custom-paint widget nodes. */
export type QuireWidgetCustomPaintCallback = (
  rect: QuireRect,
  id: string,
  runtime: QuireWidgetRuntimeContext
) => readonly QuireDisplayCommand[];

/** Constraints passed through the widget layout pipeline. */
export interface QuireWidgetConstraints {
  /** Smallest width the laid out widget should occupy. */
  readonly minWidth: number;
  /** Largest width the laid out widget may occupy. */
  readonly maxWidth: number;
  /** Smallest height the laid out widget should occupy. */
  readonly minHeight: number;
  /** Largest height the laid out widget may occupy. */
  readonly maxHeight: number;
}

/** Insets used by padding and flex primitives. */
export interface QuireWidgetInsets {
  /** Top inset in canvas coordinate space. */
  readonly top: number;
  /** Right inset in canvas coordinate space. */
  readonly right: number;
  /** Bottom inset in canvas coordinate space. */
  readonly bottom: number;
  /** Left inset in canvas coordinate space. */
  readonly left: number;
}

/** Text style accepted by text widget primitives. */
export interface QuireWidgetTextStyle {
  /** CSS font shorthand or renderer-defined font token. */
  readonly font?: string;
  /** CSS color or renderer-defined text color token. */
  readonly color?: string;
  /** Optional line height used as the text command bounds height. */
  readonly lineHeight?: number;
  /** Optional baseline offset from the text command top edge. */
  readonly baselineOffset?: number;
}

/** Stroke style accepted by rectangle-like widget primitives. */
export interface QuireWidgetStrokeStyle {
  /** CSS color or renderer-defined stroke token. */
  readonly color: string;
  /** Optional stroke width in canvas coordinate space. */
  readonly width?: number;
  /** Optional alternating dash and gap lengths in canvas coordinate space. */
  readonly lineDash?: readonly number[];
}

/** Box style accepted by rectangle widget primitives. */
export interface QuireWidgetBoxStyle {
  /** CSS color or renderer-defined fill token. */
  readonly fill?: string;
  /** Optional border stroke description. */
  readonly stroke?: QuireWidgetStrokeStyle;
  /** Optional corner radius clamped to the resolved rectangle. */
  readonly borderRadius?: number;
}

/** Divider style accepted by divider widget primitives. */
export interface QuireWidgetDividerStyle {
  /** CSS color or renderer-defined stroke token. */
  readonly color?: string;
  /** Optional stroke width in canvas coordinate space. */
  readonly width?: number;
}

/** Base fields shared by every widget description. */
export interface QuireViewNodeBase<TContext = unknown> {
  /** Optional stable id used as the command id prefix. */
  readonly id?: string;
  /** Optional document range represented by this widget. */
  readonly range?: QuireDocumentRange;
  /** Optional semantic role used by hit testing, events, and accessibility adapters. */
  readonly role?: string;
  /** Optional named part within a larger semantic widget. */
  readonly part?: string;
  /** Optional semantic owner that produced or owns this widget node. */
  readonly owner?: QuireViewOwner;
  /** Event bindings keyed by built-in or custom event names. */
  readonly events?: QuireViewEventBindingMap<TContext>;
  /** Convenience binding for the common click event. */
  readonly onClick?: QuireViewEventBinding<TContext>;
  /** Interaction metadata such as cursor, pointer-events, and nested event bindings. */
  readonly interaction?: QuireViewInteraction<TContext>;
}

/** Filled or stroked rectangle primitive. */
export interface QuireBoxViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for box primitives. */
  readonly kind: "box";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Box paint style. */
  readonly style?: QuireWidgetBoxStyle;
}

/** Single-line text primitive. */
export interface QuireTextViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for text primitives. */
  readonly kind: "text";
  /** Text content to paint. */
  readonly text: string;
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Text paint style. */
  readonly style?: QuireWidgetTextStyle;
}

/** Static wrapped text preview primitive for non-editable widget chrome. */
export interface QuireParagraphPreviewViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for paragraph-preview primitives. */
  readonly kind: "paragraph-preview";
  /** Text content to paint as static preview lines. */
  readonly text: string;
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Maximum number of visual lines to emit. */
  readonly maxLines?: number;
  /** Overflow behavior after width, height, or maxLines are exceeded. */
  readonly overflow?: QuireWidgetTextOverflow;
  /** White-space behavior for line wrapping. */
  readonly whiteSpace?: QuireWidgetWhiteSpace;
  /** Text paint style shared by every preview line. */
  readonly style?: QuireWidgetTextStyle;
}

/** Row or column primitive with gap and padding. */
export interface QuireFlexViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for flex primitives. */
  readonly kind: "flex";
  /** Main-axis direction for child layout. */
  readonly direction: QuireWidgetFlexDirection;
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Gap between adjacent children in canvas coordinate space. */
  readonly gap?: number;
  /** Padding applied inside the flex container. */
  readonly padding?: QuireWidgetInsets;
  /** Children laid out along the flex direction. */
  readonly children: readonly QuireViewNode<TContext>[];
}

/** Semantic surface container with optional background, border, and child. */
export interface QuireSurfaceViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for surface primitives. */
  readonly kind: "surface";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Surface paint style. */
  readonly style?: QuireWidgetBoxStyle;
  /** Optional padding applied before laying out the child. */
  readonly padding?: QuireWidgetInsets;
  /** Optional child drawn above the surface chrome. */
  readonly child?: QuireViewNode<TContext>;
}

/** Overlay primitive that paints all children at the same origin. */
export interface QuireOverlayViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for overlay primitives. */
  readonly kind: "overlay";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Children painted in order at the overlay origin. */
  readonly children: readonly QuireViewNode<TContext>[];
}

/** Layout wrapper that positions one child inside the current parent bounds. */
export interface QuirePositionedViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for positioned primitives. */
  readonly kind: "positioned";
  /** Offset from the parent left edge in canvas coordinate space. */
  readonly left?: number;
  /** Offset from the parent right edge in canvas coordinate space. */
  readonly right?: number;
  /** Offset from the parent top edge in canvas coordinate space. */
  readonly top?: number;
  /** Offset from the parent bottom edge in canvas coordinate space. */
  readonly bottom?: number;
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Child laid out at the resolved position. */
  readonly child: QuireViewNode<TContext>;
}

/** Layout-only padding wrapper. */
export interface QuirePaddingViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for padding primitives. */
  readonly kind: "padding";
  /** Insets applied around the child. */
  readonly insets: QuireWidgetInsets;
  /** Child laid out inside the inset content rectangle. */
  readonly child: QuireViewNode<TContext>;
}

/** Rectangular clip wrapper. */
export interface QuireClipViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for clip primitives. */
  readonly kind: "clip";
  /** Optional fixed width for the clip rectangle. */
  readonly width?: number;
  /** Optional fixed height for the clip rectangle. */
  readonly height?: number;
  /** Child painted inside the clip rectangle. */
  readonly child: QuireViewNode<TContext>;
}

/** Layout spacer used to reserve or flex remaining space. */
export interface QuireSpacerViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for spacer primitives. */
  readonly kind: "spacer";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Flex grow factor used by flex containers. */
  readonly flex?: number;
}

/** Visual divider used by lightweight widget chrome. */
export interface QuireDividerViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for divider primitives. */
  readonly kind: "divider";
  /** Divider axis. Vertical dividers draw top-to-bottom, horizontal dividers left-to-right. */
  readonly axis: QuireWidgetDividerAxis;
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Divider stroke style. */
  readonly style?: QuireWidgetDividerStyle;
}

/** Escape hatch that emits existing display-list commands. */
export interface QuireCustomPaintViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for custom paint primitives. */
  readonly kind: "custom-paint";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** Paint callback that receives the resolved widget rectangle and id prefix. */
  readonly paint: QuireWidgetCustomPaintCallback;
}

/** DOM overlay portal primitive with resolved canvas geometry. */
export interface QuireDomOverlayViewNode<TContext = unknown> extends QuireViewNodeBase<TContext> {
  /** Discriminator for DOM overlay primitives. */
  readonly kind: "dom-overlay";
  /** Optional fixed width in canvas coordinate space. */
  readonly width?: number;
  /** Optional fixed height in canvas coordinate space. */
  readonly height?: number;
  /** HTML content mounted into the overlay host. */
  readonly html: string;
  /** Optional accessibility label for the overlay host. */
  readonly ariaLabel?: string;
}

/** Renderer-neutral node description compiled into retained layer products. */
export type QuireViewNode<TContext = unknown> =
  | QuireBoxViewNode<TContext>
  | QuireTextViewNode<TContext>
  | QuireParagraphPreviewViewNode<TContext>
  | QuireFlexViewNode<TContext>
  | QuireSurfaceViewNode<TContext>
  | QuireOverlayViewNode<TContext>
  | QuirePositionedViewNode<TContext>
  | QuirePaddingViewNode<TContext>
  | QuireClipViewNode<TContext>
  | QuireSpacerViewNode<TContext>
  | QuireDividerViewNode<TContext>
  | QuireCustomPaintViewNode<TContext>
  | QuireDomOverlayViewNode<TContext>;

/** Options used to compile one widget tree into display output. */
export interface QuireViewCompileOptions {
  /** Stable id prefix assigned to generated commands. */
  readonly id: string;
  /** Widget node to compile. */
  readonly node: QuireViewNode;
  /** Origin where the widget tree should be laid out. */
  readonly origin: QuirePoint;
  /** Constraints that bound the root widget. */
  readonly constraints: QuireWidgetConstraints;
  /** Optional document range inherited by nodes without their own range. */
  readonly range?: QuireDocumentRange;
  /** Optional paint layer inherited by generated commands. */
  readonly layer?: QuireDisplayCommandLayer;
  /** Optional text measurer used by text primitives. */
  readonly measureText?: QuireWidgetTextMeasurer;
  /** Optional host surface metadata exposed to widget runtime callbacks. */
  readonly host?: QuireViewHost;
}

/** Output produced by compiling a widget tree. */
export interface QuireViewCompileResult {
  /** Resolved rectangle occupied by the widget tree. */
  readonly rect: QuireRect;
  /** Display list that can be painted by Canvas 2D or serialized to SVG. */
  readonly displayList: QuireDisplayList;
  /** DOM overlay descriptors emitted by portal primitives. */
  readonly domOverlays: readonly QuireLayoutDomOverlay[];
  /** Resolved interaction targets emitted by semantic or eventful widget nodes. */
  readonly targets: readonly QuireViewTarget[];
}

/** Internal output produced while recursively compiling one widget node. */
export interface QuireCompiledViewNode {
  /** Resolved rectangle occupied by the widget node. */
  readonly rect: QuireRect;
  /** Display commands emitted by the widget node. */
  readonly commands: readonly QuireDisplayCommand[];
  /** DOM overlays emitted by the widget node. */
  readonly domOverlays: readonly QuireLayoutDomOverlay[];
  /** Interaction targets emitted by this node subtree. */
  readonly targets?: readonly QuireViewTarget[];
}

/** Options accepted by the box primitive factory. */
export type QuireBoxViewNodeOptions<TContext = unknown> = Omit<QuireBoxViewNode<TContext>, "kind">;

/** Options accepted by the text primitive factory. */
export type QuireTextViewNodeOptions<TContext = unknown> = Omit<QuireTextViewNode<TContext>, "kind">;

/** Options accepted by the paragraph-preview primitive factory. */
export type QuireParagraphPreviewViewNodeOptions<TContext = unknown> = Omit<
  QuireParagraphPreviewViewNode<TContext>,
  "kind"
>;

/** Options accepted by the flex primitive factory. */
export type QuireFlexViewNodeWithDirectionOptions<TContext = unknown> = Omit<
  QuireFlexViewNode<TContext>,
  "kind"
>;

/** Options accepted by row and column convenience factories. */
export type QuireFlexViewNodeOptions<TContext = unknown> = Omit<
  QuireFlexViewNode<TContext>,
  "kind" | "direction"
>;

/** Options accepted by the surface primitive factory. */
export type QuireSurfaceViewNodeOptions<TContext = unknown> = Omit<QuireSurfaceViewNode<TContext>, "kind">;

/** Options accepted by the overlay primitive factory. */
export type QuireOverlayViewNodeOptions<TContext = unknown> = Omit<QuireOverlayViewNode<TContext>, "kind">;

/** Options accepted by the positioned primitive factory. */
export type QuirePositionedViewNodeOptions<TContext = unknown> = Omit<
  QuirePositionedViewNode<TContext>,
  "kind"
>;

/** Options accepted by the padding primitive factory. */
export type QuirePaddingViewNodeOptions<TContext = unknown> = Omit<QuirePaddingViewNode<TContext>, "kind">;

/** Options accepted by the clip primitive factory. */
export type QuireClipViewNodeOptions<TContext = unknown> = Omit<QuireClipViewNode<TContext>, "kind">;

/** Options accepted by the spacer primitive factory. */
export type QuireSpacerViewNodeOptions<TContext = unknown> = Omit<QuireSpacerViewNode<TContext>, "kind">;

/** Options accepted by the divider primitive factory. */
export type QuireDividerViewNodeOptions<TContext = unknown> = Omit<QuireDividerViewNode<TContext>, "kind">;

/** Options accepted by the custom-paint primitive factory. */
export type QuireCustomPaintViewNodeOptions<TContext = unknown> = Omit<
  QuireCustomPaintViewNode<TContext>,
  "kind"
>;

/** Options accepted by the DOM overlay primitive factory. */
export type QuireDomOverlayViewNodeOptions<TContext = unknown> = Omit<
  QuireDomOverlayViewNode<TContext>,
  "kind"
>;
