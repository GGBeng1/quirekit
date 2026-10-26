import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";

/** Position and boundary affinity supplied without retained owner identity. */
export interface QuireLayoutProviderInteractionAnchor {
  /** Document position represented by the provider target. */
  readonly position: QuireDocumentPosition;
  /** Side of an ambiguous document boundary represented by the target. */
  readonly affinity: "before" | "after";
}

/** Intent that resolves to editable or selectable text. */
export interface QuireLayoutProviderTextInteractionIntent {
  /** Discriminator for editable text intent. */
  readonly kind: "text";
  /** Owner-free document anchor scoped by framework authority during compilation. */
  readonly anchor: QuireLayoutProviderInteractionAnchor;
}

/** Intent that resolves to an independently owned table cell. */
export interface QuireLayoutProviderCellInteractionIntent {
  /** Discriminator for table cell intent. */
  readonly kind: "cell";
  /** Stable table or grid identity owned by the provider. */
  readonly tableId: string;
  /** Stable cell identity inside the provider-owned table or grid. */
  readonly cellId: string;
}

/** Intent that resolves to one document node. */
export interface QuireLayoutProviderNodeInteractionIntent {
  /** Discriminator for document node intent. */
  readonly kind: "node";
  /** Stable node identity owned by the provider or source extension. */
  readonly nodeId: string;
  /** Document position immediately before the represented node. */
  readonly pos: QuireDocumentPosition;
}

/** Intent that resolves to a drawing or floating object body. */
export interface QuireLayoutProviderObjectInteractionIntent {
  /** Discriminator for object intent. */
  readonly kind: "object";
  /** Stable object identity owned by the provider or source extension. */
  readonly objectId: string;
}

/** Intent that resolves to an image, video, or other media part. */
export interface QuireLayoutProviderMediaInteractionIntent {
  /** Discriminator for media intent. */
  readonly kind: "media";
  /** Stable media identity owned by the source extension. */
  readonly mediaId: string;
  /** Semantic media part represented by this target. */
  readonly part: string;
}

/** Intent that resolves to a plugin-provided embed part. */
export interface QuireLayoutProviderEmbedInteractionIntent {
  /** Discriminator for embed intent. */
  readonly kind: "embed";
  /** Stable embed identity owned by the source extension. */
  readonly embedId: string;
  /** Semantic embed part represented by this target. */
  readonly part: string;
}

/** Intent that resolves to a persisted content-control part. */
export interface QuireLayoutProviderContentControlInteractionIntent {
  /** Discriminator for content-control intent. */
  readonly kind: "content-control";
  /** Stable content-control identity owned by the source extension. */
  readonly controlId: string;
  /** Standard or extension-owned content-control type used for feature routing. */
  readonly controlType: string;
  /** Semantic content-control part represented by this target. */
  readonly part: string;
}

/** Intent that resolves to an interactive extension widget part. */
export interface QuireLayoutProviderWidgetInteractionIntent {
  /** Discriminator for widget intent. */
  readonly kind: "widget";
  /** Stable widget identity owned by the source extension. */
  readonly widgetId: string;
  /** Semantic widget part represented by this target. */
  readonly part: string;
}

/** Intent that resolves to generated field display text. */
export interface QuireLayoutProviderFieldInteractionIntent {
  /** Discriminator for field intent. */
  readonly kind: "field";
  /** Stable field identity owned by the source extension. */
  readonly fieldId: string;
  /** Owner-free field anchor scoped by framework authority during compilation. */
  readonly anchor: QuireLayoutProviderInteractionAnchor;
}

/** Intent that resolves to selectable readonly text. */
export interface QuireLayoutProviderReadonlyTextInteractionIntent {
  /** Discriminator for readonly-text intent. */
  readonly kind: "readonly-text";
  /** Stable node identity that owns the readonly display text. */
  readonly ownerNodeId: string;
  /** Exact readonly source range represented by the target. */
  readonly range: QuireDocumentRange;
}

/** Intent that resolves to a caret stop at a structure boundary. */
export interface QuireLayoutProviderBoundaryCaretInteractionIntent {
  /** Discriminator for boundary-caret intent. */
  readonly kind: "boundary-caret";
  /** Owner-free boundary anchor scoped by framework authority during compilation. */
  readonly anchor: QuireLayoutProviderInteractionAnchor;
  /** Side of the represented structure boundary. */
  readonly side: "before" | "after";
}

/** Intent that resolves to a command or manipulation control. */
export interface QuireLayoutProviderControlInteractionIntent {
  /** Discriminator for control intent. */
  readonly kind: "control";
  /** Stable control identity owned by the provider or source extension. */
  readonly controlId: string;
}

/** Capability-owned semantic intent accepted from external layout providers. */
export type QuireLayoutProviderInteractionIntent =
  | QuireLayoutProviderTextInteractionIntent
  | QuireLayoutProviderCellInteractionIntent
  | QuireLayoutProviderNodeInteractionIntent
  | QuireLayoutProviderObjectInteractionIntent
  | QuireLayoutProviderMediaInteractionIntent
  | QuireLayoutProviderEmbedInteractionIntent
  | QuireLayoutProviderContentControlInteractionIntent
  | QuireLayoutProviderWidgetInteractionIntent
  | QuireLayoutProviderFieldInteractionIntent
  | QuireLayoutProviderReadonlyTextInteractionIntent
  | QuireLayoutProviderBoundaryCaretInteractionIntent
  | QuireLayoutProviderControlInteractionIntent;

/** Editor-oriented layer attached to one provider interaction target. */
export interface QuireLayoutProviderInteractionLayer {
  /** Visual plane that owns display and hit-test ordering. */
  readonly plane:
    | "page-background"
    | "content"
    | "page-chrome"
    | "selection"
    | "annotation"
    | "drawing"
    | "controls"
    | "dom-proxy"
    | "floating-ui";
  /** Optional z-index inside the selected plane. */
  readonly zIndex?: number | undefined;
  /** Optional tie-breaker priority inside an equal z-index. */
  readonly priority?: number | undefined;
}

/** Pointer behavior attached to one provider interaction target. */
export interface QuireLayoutProviderInteractionPointerPolicy {
  /** Shared pointer behavior requested by the target. */
  readonly kind: "select" | "dispatch" | "pass-through" | "focus-only";
  /** Whether the mounted editor should focus after handling pointerdown. */
  readonly shouldFocusEditor?: boolean | undefined;
  /** Whether the mounted runtime should prevent the browser default. */
  readonly shouldPreventDefault?: boolean | undefined;
}

/** Region-owned interaction target produced during versioned provider layout. */
export interface QuireLayoutProviderInteractionTarget {
  /** Stable target id inside the provider output. */
  readonly targetId: string;
  /** Exact document range represented by the target. */
  readonly range: QuireDocumentRange;
  /** Target rectangle in the explicitly tagged coordinate space. */
  readonly rect: QuireRect;
  /** Current canonical target compiler accepts document-space rectangles only. */
  readonly coordinateSpace: "document";
  /** Semantic capability delegated to shared interaction authority. */
  readonly intent: QuireLayoutProviderInteractionIntent;
  /** Optional editor layer used for display and hit-test ordering. */
  readonly layer?: QuireLayoutProviderInteractionLayer | undefined;
  /** Optional shared pointer policy overriding the layer default. */
  readonly pointerPolicy?: QuireLayoutProviderInteractionPointerPolicy | undefined;
}
