import type {
  Decoration as PMDecoration,
  DecorationAttrs,
  DecorationSet,
  EditorState,
  EditorView,
  Mark,
  Mapping,
  Node as PMNode,
  Transaction
} from "@quirekit/pm";
import type { QuireEditor } from "../Editor";
import type { Decoration } from "./decoration";

/** Arguments supplied when a decoration set is created for an editor state. */
export interface DecorationCreateProps {
  /** Editor that owns the decoration contribution. */
  readonly editor: QuireEditor;
  /** Exact state for which the decorations are being built. */
  readonly state: EditorState;
  /** Mounted HTML view, or null before mounting and on non-HTML surfaces. */
  readonly view: EditorView | null;
}

/** Arguments supplied when a decoration contribution decides whether to rebuild. */
export interface DecorationShouldUpdateProps {
  /** Editor that owns the decoration contribution. */
  readonly editor: QuireEditor;
  /** Transaction being applied. */
  readonly tr: Transaction;
  /** State before the transaction. */
  readonly oldState: EditorState;
  /** State after the transaction. */
  readonly newState: EditorState;
}

/** Arguments supplied when only one changed top-level block range is rebuilt. */
export interface DecorationRangeProps extends DecorationCreateProps {
  /** Inclusive start of the owned top-level block range. */
  readonly from: number;
  /** Exclusive range end, except that the final block owns the document end. */
  readonly to: number;
}

/** Supported declarative decoration recomputation policies. */
export type DecorationUpdateStrategy = "document" | "changedRanges" | "manual";

/** Fields shared by all declarative decoration contributions. */
export interface BaseDecorationSpec {
  /**
   * Creates the complete decoration collection for a state.
   *
   * @param props - Current editor, state, and mounted HTML view.
   * @returns Decorations owned by the extension.
   */
  readonly create: (props: DecorationCreateProps) => Decoration[];
  /**
   * Decides whether an ordinary transaction requires recomputation.
   *
   * @param props - Transaction and its old/new states.
   * @returns Whether the extension should rebuild its decorations.
   */
  readonly shouldUpdate?:
    | ((props: DecorationShouldUpdateProps) => boolean)
    | undefined;
}

/** Decoration contribution that rebuilds its complete document projection. */
export interface DocumentDecorationSpec extends BaseDecorationSpec {
  /** Full-document recomputation policy. */
  readonly update?: "document" | undefined;
  /** Range factories are reserved for the changed-ranges policy. */
  readonly createInRange?: never;
}

/** Decoration contribution that rebuilds only touched top-level block ranges. */
export interface ChangedRangesDecorationSpec extends BaseDecorationSpec {
  /** Incremental changed-range recomputation policy. */
  readonly update: "changedRanges";
  /**
   * Creates decorations owned by one touched block range.
   *
   * @param props - Current editor state and exact owned range.
   * @returns Decorations anchored inside the requested range.
   */
  readonly createInRange: (props: DecorationRangeProps) => Decoration[];
}

/** Decoration contribution recomputed only through `updateDecorations()`. */
export interface ManualDecorationSpec extends BaseDecorationSpec {
  /** Explicit-only recomputation policy. */
  readonly update: "manual";
  /** Manual contributions cannot also use transaction predicates. */
  readonly shouldUpdate?: never;
  /** Manual contributions cannot use changed-range factories. */
  readonly createInRange?: never;
}

/** Declarative decoration contribution returned by `addDecorations()`. */
export type DecorationSpec =
  | DocumentDecorationSpec
  | ChangedRangesDecorationSpec
  | ManualDecorationSpec;

/** Transaction metadata used to force decoration recomputation. */
export interface DecorationMeta {
  /** Force-recompute discriminator. */
  readonly type: "force";
  /** Optional extension name; omission targets every contribution. */
  readonly name?: string | undefined;
}

/** Plugin state owned by the decoration manager. */
export interface DecorationManagerState {
  /** Decoration set owned by each contributing extension. */
  readonly decorationSetsByExtension: Record<string, DecorationSet>;
  /** Live widget identities owned by each contributing extension. */
  readonly widgetKeysByExtension: Record<string, Set<string>>;
  /** Merged decoration projection exposed through the plugin props. */
  readonly mergedDecorationSet: DecorationSet;
  /** Union of all live widget identities. */
  readonly widgetKeys: Set<string>;
}

/** Resolved extension decoration entry. */
export interface ResolvedDecorationEntry {
  /** Extension name that owns the entry. */
  readonly name: string;
  /** Validated declarative decoration specification. */
  readonly spec: DecorationSpec;
}

/** Lazy extension entry accepted by the decoration manager. */
export interface DecorationManagerEntry {
  /** Extension name that owns the entry. */
  readonly name: string;
  /**
   * Resolves the extension's declarative decoration specification.
   *
   * @returns Decoration specification or null when disabled by configuration.
   */
  readonly addDecorations: () => DecorationSpec | null;
}

/** Options shared by DOM-backed widget decorations. */
export interface WidgetDecorationOptions {
  /** Ordering side relative to the widget position. */
  readonly side?: number | undefined;
  /** Whether cursor motion may cross a widget from the non-preferred side. */
  readonly relaxedSide?: boolean | undefined;
  /** Marks inherited by content inserted beside the widget. */
  readonly marks?: readonly Mark[] | undefined;
  /**
   * Decides whether the editor should ignore a DOM event from the widget.
   *
   * @param event - DOM event originating from the widget.
   * @returns Whether the widget consumed the event.
   */
  readonly stopEvent?: ((event: Event) => boolean) | undefined;
  /** Whether selection changes inside the widget should be ignored. */
  readonly ignoreSelection?: boolean | undefined;
  /**
   * Cleans up a DOM widget when ProseMirror drops it.
   *
   * @param node - Widget DOM node being removed.
   */
  readonly destroy?: ((node: globalThis.Node) => void) | undefined;
}

/** Minimum framework renderer contract used by `createWidgetDecoration()`. */
export interface WidgetRenderer {
  /**
   * Updates the mounted renderer's props.
   *
   * @param props - Complete next renderer props.
   */
  readonly updateProps: (props: Record<string, any>) => void;
  /** Destroys the mounted renderer. */
  readonly destroy: () => void;
}

/** Options for a framework-rendered widget decoration. */
export interface CreateWidgetDecorationOptions<
  TRenderer extends WidgetRenderer
> extends WidgetDecorationOptions {
  /** Editor that owns the renderer cache. */
  readonly editor: QuireEditor;
  /** Document position where the widget is anchored. */
  readonly pos: number;
  /** Stable, document-position-independent widget identity. */
  readonly key: string;
  /** Framework component props. */
  readonly props: Record<string, any>;
  /** Framework-specific editor cache identity. */
  readonly cacheKey: symbol;
  /**
   * Builds view-bound props for each widget materialization.
   *
   * @param getPos - Current widget position resolver.
   * @returns Props merged into the authored component props.
   */
  readonly context: (
    getPos: () => number | undefined
  ) => Record<string, any>;
  /**
   * Creates the framework renderer on first mount.
   *
   * @param props - Initial merged renderer props.
   * @returns New framework renderer.
   */
  readonly create: (props: Record<string, any>) => TRenderer;
  /**
   * Returns the DOM element inserted by ProseMirror.
   *
   * @param renderer - Live framework renderer.
   * @returns Widget root element.
   */
  readonly materialize: (renderer: TRenderer) => HTMLElement;
}

/** Public shape of the hidden decoration strategy carried by ProseMirror. */
export interface DecorationType {
  /** Decoration-specific metadata. */
  readonly spec: any;
  /**
   * Maps one decoration through a document mapping.
   *
   * @param mapping - Position mapping to apply.
   * @param span - Decoration being mapped.
   * @param offset - New parent offset.
   * @param oldOffset - Previous parent offset.
   * @returns Mapped decoration or null when deleted.
   */
  readonly map: (
    mapping: Mapping,
    span: PMDecoration,
    offset: number,
    oldOffset: number
  ) => PMDecoration | null;
  /**
   * Checks whether a decoration remains valid for a node.
   *
   * @param node - Node containing the decoration.
   * @param span - Decoration being checked.
   * @returns Whether the decoration is valid.
   */
  readonly valid: (node: PMNode, span: PMDecoration) => boolean;
  /**
   * Compares decoration strategy identity.
   *
   * @param other - Strategy to compare.
   * @returns Whether both strategies are equivalent.
   */
  readonly eq: (other: DecorationType) => boolean;
  /**
   * Destroys a DOM-backed decoration.
   *
   * @param dom - DOM node owned by the decoration.
   */
  readonly destroy: (dom: globalThis.Node) => void;
  /** DOM attributes rendered by the decoration. */
  readonly attrs: DecorationAttrs;
}

/** ProseMirror decoration with its otherwise-hidden strategy exposed. */
export type DecorationWithType = PMDecoration & {
  /** Hidden ProseMirror decoration strategy. */
  readonly type: DecorationType;
};

/** Semantic owner of one decoration-projected interaction target. */
export interface QuireDecorationInteractionOwner {
  /** Stable owner family, such as `content-control`. */
  readonly kind: string;
  /** Document-local owner identity. */
  readonly id: string;
}

/** Named event handler resolved by one decoration-projected interaction target. */
export interface QuireDecorationInteractionHandler {
  /** Extension-owned mounted view event-handler id. */
  readonly id: string;
  /** Optional clone-safe event payload supplied before the exact range is added. */
  readonly payload?: unknown;
}

/** Projects one target over each exact physical fragment of the decoration range. */
export interface QuireDecorationRangeInteractionPlacement {
  /** Range-fragment projection discriminator. */
  readonly kind: "range";
}

/** Projects one target immediately before the first physical range fragment. */
export interface QuireDecorationInlineStartInteractionPlacement {
  /** Inline-start boundary projection discriminator. */
  readonly kind: "inline-start";
  /** Interaction width in renderer coordinates. */
  readonly width: number;
  /** Gap before the first authored fragment in renderer coordinates. */
  readonly gap: number;
}

/** Projects one target after an exact zero-width document position. */
export interface QuireDecorationPointInteractionPlacement {
  /** Zero-width point projection discriminator. */
  readonly kind: "point";
  /** Horizontal anchor policy; omitted values remain immediately after the caret. */
  readonly alignment?: "caret-after" | "visual-line-end" | undefined;
  /** Retained target width in renderer coordinates. */
  readonly width: number;
  /** Retained target height in renderer coordinates. */
  readonly height: number;
  /** Gap after the resolved horizontal anchor edge in renderer coordinates. */
  readonly gap: number;
}

/** Renderer-neutral geometry requested by one decoration interaction. */
export type QuireDecorationInteractionPlacement =
  | QuireDecorationRangeInteractionPlacement
  | QuireDecorationInlineStartInteractionPlacement
  | QuireDecorationPointInteractionPlacement;

/** Typed interaction intent attached to a ProseMirror decoration spec. */
export interface QuireDecorationInteractionDescriptor {
  /** Stable identity within the source decoration. */
  readonly id: string;
  /** Geometry projection independent from decoration paint. */
  readonly placement: QuireDecorationInteractionPlacement;
  /** Semantic target role. */
  readonly role: string;
  /** Named target part within the semantic owner. */
  readonly part: string;
  /** Exact semantic owner that produced the target. */
  readonly owner: QuireDecorationInteractionOwner;
  /** Optional mounted-surface cursor. */
  readonly cursor?: string | undefined;
  /** Optional extension-owned named event handler. */
  readonly handler?: QuireDecorationInteractionHandler | undefined;
}

/** QuireKit-owned fields carried by a ProseMirror decoration spec. */
export interface QuireDecorationSpec {
  /** Renderer-neutral attributes for zero-width widgets without a DOM node. */
  readonly quireAttrs?: Readonly<DecorationAttrs> | undefined;
  /** Typed retained interactions projected independently from paint attributes. */
  readonly quireInteractions?:
    readonly QuireDecorationInteractionDescriptor[] | undefined;
  /**
   * Restricts the decoration to DOM-rendered views. Layout-painted views skip
   * it, for DOM projections of state those views already paint from layout.
   */
  readonly quireRenderTarget?: "dom" | undefined;
}
