import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireInlineSourceAnchor,
  QuireInlineTextRun
} from "../inline";
import type { QuireTextFragment } from "../text";

/** Renderer-neutral page-placement policy owned by one block. */
export interface QuireBlockPaginationPolicy {
  /** Optional forced page break before the block. */
  readonly breakBefore?: "page" | undefined;
  /** Whether the complete block should move together when it fits on a fresh page. */
  readonly keepTogether?: boolean | undefined;
  /** Whether the block should remain with the first item of its successor. */
  readonly keepWithNext?: boolean | undefined;
  /** Minimum block lines retained at the top of a continuation page. */
  readonly widows?: number | undefined;
  /** Minimum block lines retained at the bottom of the current page. */
  readonly orphans?: number | undefined;
}

/** Consumer-neutral input consumed by recursive block flow. */
export interface QuireBlockFlowInput {
  /** Stable source identity for the produced block result. */
  readonly id: string;
  /** Document range represented by the block. */
  readonly range: QuireDocumentRange;
  /** Minimum block extent before measured content expands it. */
  readonly minHeight?: number | undefined;
  /** Explicit spacing before this block, in CSS pixels. */
  readonly spacingBefore?: number | undefined;
  /** Explicit spacing after this block, in CSS pixels. */
  readonly spacingAfter?: number | undefined;
  /** Non-collapsing inset before this block's intrinsic content, in CSS pixels. */
  readonly blockStartInset?: number | undefined;
  /** Non-collapsing inset after this block's intrinsic content, in CSS pixels. */
  readonly blockEndInset?: number | undefined;
  /** Local text fragments measured from the block origin. */
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
  /** Logical inline runs retained for transient reflow. */
  readonly textRuns?: readonly QuireInlineTextRun[] | undefined;
  /** Logical non-text inline sources awaiting consumer compilation. */
  readonly sourceAnchors?: readonly QuireInlineSourceAnchor[] | undefined;
  /** Position-independent dependency signature for cache reuse. */
  readonly layoutSignature?: string | undefined;
  /** Whether the block currently carries estimated rather than shaped geometry. */
  readonly estimated?: boolean | undefined;
  /** Optional renderer-neutral page-placement policy owned by the block. */
  readonly pagination?: QuireBlockPaginationPolicy | undefined;
  /** Recursive child-flow inputs in source order. */
  readonly children?: readonly QuireBlockFlowInput[] | undefined;
}

/** Consumer-neutral geometry produced for one block-flow input. */
export interface QuireBlockFlowBox {
  /** Stable source identity represented by the box. */
  readonly id: string;
  /** Document range represented by the box. */
  readonly range: QuireDocumentRange;
  /** Parent-coordinate rectangle occupied by the box. */
  readonly rect: QuireRect;
  /** Wrapping rectangle retained for transient inline reflow. */
  readonly inlineLayoutRect?: QuireRect | undefined;
  /** Position-independent dependency signature forwarded from the input. */
  readonly layoutSignature?: string | undefined;
  /** Optional renderer-neutral page-placement policy forwarded from the input. */
  readonly pagination?: QuireBlockPaginationPolicy | undefined;
  /** Parent-coordinate text fragments owned by the box. */
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
  /** Logical inline runs owned by the box. */
  readonly textRuns?: readonly QuireInlineTextRun[] | undefined;
  /** Logical non-text inline sources owned by the box. */
  readonly sourceAnchors?: readonly QuireInlineSourceAnchor[] | undefined;
}

/** Consumer-neutral container produced by recursive block flow. */
export interface QuireBlockFlowContainer<
  Box extends QuireBlockFlowBox = QuireBlockFlowBox
> extends QuireBlockFlowBox {
  /** Child boxes in visual flow order. */
  readonly children: readonly Box[];
}

/** Geometry key used to validate one cached block result. */
export interface QuireBlockFlowCacheKey {
  /** Resolved horizontal origin. */
  readonly x: number;
  /** Resolved vertical origin. */
  readonly y: number;
  /** Available inline size in CSS pixels. */
  readonly width: number;
  /** Default block extent for unmeasured leaves. */
  readonly blockHeight: number;
  /** Gap between recursive siblings. */
  readonly blockGap: number;
  /** Available parent fragment extent, when bounded. */
  readonly fragmentBlockSize?: number | undefined;
}

/** Geometry key used to validate one cached block container. */
export interface QuireBlockFlowContainerCacheKey extends QuireBlockFlowCacheKey {
  /** Stable container identity. */
  readonly id: string;
}

/** Reusable child prefix returned by a block-flow cache. */
export interface QuireBlockFlowPrefixReuse<
  Box extends QuireBlockFlowBox
> {
  /** Retained boxes before the active dirty range. */
  readonly children: readonly Box[];
  /** Number of current inputs represented by the retained prefix. */
  readonly childCount: number;
  /** Next vertical position after the retained prefix. */
  readonly nextY: number;
}

/** Request for appending a reusable block-flow prefix. */
export interface QuireBlockFlowPrefixAppendRequest<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> {
  /** Container geometry authority. */
  readonly key: QuireBlockFlowContainerCacheKey;
  /** Current child inputs. */
  readonly children: readonly Input[];
  /** Current changed document range. */
  readonly dirtyRange: QuireDocumentRange;
  /** Mutable target receiving retained boxes. */
  readonly target: Box[];
}

/** Result of appending a reusable block-flow prefix. */
export interface QuireBlockFlowPrefixAppendResult {
  /** Number of current inputs represented by the appended prefix. */
  readonly childCount: number;
  /** Next vertical position after the appended prefix. */
  readonly nextY: number;
}

/** Reusable child suffix returned by a block-flow cache. */
export interface QuireBlockFlowSuffixReuse<
  Box extends QuireBlockFlowBox
> {
  /** Retained boxes after the active dirty range. */
  readonly children: readonly Box[];
  /** Number of current inputs represented by the retained suffix. */
  readonly childCount: number;
  /** Next vertical position after the retained suffix. */
  readonly nextY: number;
}

/** Request for appending a reusable block-flow suffix. */
export interface QuireBlockFlowSuffixAppendRequest<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> {
  /** Container geometry authority. */
  readonly key: QuireBlockFlowContainerCacheKey;
  /** Current child inputs. */
  readonly children: readonly Input[];
  /** Input index where suffix reuse may begin. */
  readonly startIndex: number;
  /** Resolved vertical position for the first suffix child. */
  readonly nextY: number;
  /** Current changed document range. */
  readonly dirtyRange: QuireDocumentRange;
  /** Mutable target receiving retained boxes. */
  readonly target: Box[];
}

/** Result of appending a reusable block-flow suffix. */
export interface QuireBlockFlowSuffixAppendResult {
  /** Number of current inputs represented by the appended suffix. */
  readonly childCount: number;
  /** Next vertical position after the appended suffix. */
  readonly nextY: number;
}

/** Cache authority consumed by consumer-neutral block flow. */
export interface QuireBlockFlowCacheAdapter<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> {
  /**
   * Reads one cached block result.
   *
   * @param input - Stable block input identity.
   * @param key - Resolved geometry key.
   * @returns Cached box, or undefined on a miss.
   */
  get(input: Input, key: QuireBlockFlowCacheKey): Box | undefined;

  /**
   * Stores one block result.
   *
   * @param input - Stable block input identity.
   * @param key - Resolved geometry key.
   * @param box - Produced block result.
   * @param dirtyRange - Active changed range, when present.
   * @returns Nothing.
   */
  set(
    input: Input,
    key: QuireBlockFlowCacheKey,
    box: Box,
    dirtyRange?: QuireDocumentRange | null | undefined
  ): void;

  /**
   * Translates one retained text fragment.
   *
   * @param fragment - Source text fragment.
   * @param dx - Horizontal translation.
   * @param dy - Vertical translation.
   * @returns Translated text fragment.
   */
  translateTextFragment?(
    fragment: QuireTextFragment,
    dx: number,
    dy: number
  ): QuireTextFragment;

  /**
   * Reads a reusable child prefix.
   *
   * @param key - Container geometry key.
   * @param children - Current child inputs.
   * @param dirtyRange - Current changed range.
   * @returns Reusable prefix, or undefined.
   */
  getContainerPrefix?(
    key: QuireBlockFlowContainerCacheKey,
    children: readonly Input[],
    dirtyRange: QuireDocumentRange
  ): QuireBlockFlowPrefixReuse<Box> | undefined;

  /**
   * Appends a reusable child prefix directly into a target.
   *
   * @param request - Prefix append request.
   * @returns Appended prefix metadata, or undefined.
   */
  appendContainerPrefix?(
    request: QuireBlockFlowPrefixAppendRequest<Input, Box>
  ): QuireBlockFlowPrefixAppendResult | undefined;

  /**
   * Reads a reusable child suffix.
   *
   * @param key - Container geometry key.
   * @param children - Current child inputs.
   * @param startIndex - First input eligible for suffix reuse.
   * @param nextY - Resolved position for the first suffix child.
   * @param dirtyRange - Current changed range.
   * @returns Reusable suffix, or undefined.
   */
  getContainerSuffix?(
    key: QuireBlockFlowContainerCacheKey,
    children: readonly Input[],
    startIndex: number,
    nextY: number,
    dirtyRange: QuireDocumentRange
  ): QuireBlockFlowSuffixReuse<Box> | undefined;

  /**
   * Appends a reusable child suffix directly into a target.
   *
   * @param request - Suffix append request.
   * @returns Appended suffix metadata, or undefined.
   */
  appendContainerSuffix?(
    request: QuireBlockFlowSuffixAppendRequest<Input, Box>
  ): QuireBlockFlowSuffixAppendResult | undefined;

  /**
   * Stores a laid-out container for future prefix or suffix reuse.
   *
   * @param key - Container geometry key.
   * @param children - Inputs represented by the container.
   * @param container - Produced container result.
   * @returns Nothing.
   */
  setContainer?(
    key: QuireBlockFlowContainerCacheKey,
    children: readonly Input[],
    container: QuireBlockFlowContainer<Box>
  ): void;
}

/** Resolved geometry supplied to a specialized block-flow consumer. */
export interface QuireSpecializedBlockFlowRequest<
  Input extends QuireBlockFlowInput
> {
  /** Specialized input being resolved. */
  readonly input: Input;
  /** Resolved horizontal origin. */
  readonly x: number;
  /** Resolved vertical origin. */
  readonly y: number;
  /** Available inline size. */
  readonly width: number;
  /** Default block extent. */
  readonly blockHeight: number;
  /** Gap used by recursive child flow. */
  readonly blockGap: number;
  /** Available parent fragment extent, when bounded. */
  readonly fragmentBlockSize?: number | undefined;
}

/** Typed consumer services used by neutral block-flow algorithms. */
export interface QuireBlockFlowServices<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> {
  /** Optional cache authority for neutral flow geometry. */
  readonly cache?: QuireBlockFlowCacheAdapter<Input, Box> | undefined;
  /** Active changed range used by cache projection. */
  readonly dirtyRange?: QuireDocumentRange | null | undefined;
  /**
   * Resolves recursive children in the consumer's exact input type.
   *
   * @param input - Parent block input.
   * @returns Typed recursive children, or undefined for a leaf.
   */
  readonly resolveChildren: (input: Input) => readonly Input[] | undefined;
  /**
   * Reports whether a block requires consumer-owned specialized layout.
   *
   * @param input - Block input to inspect.
   * @returns Whether generic block layout must delegate the input.
   */
  readonly isSpecialized: (input: Input) => boolean;
  /**
   * Resolves one specialized block without exposing consumer state to Layout.
   *
   * @param request - Specialized input and resolved geometry.
   * @returns Consumer-owned box, or undefined when the input is not specialized.
   */
  readonly layoutSpecialized: (
    request: QuireSpecializedBlockFlowRequest<Input>
  ) => Box | undefined;
  /**
   * Projects consumer sidecars onto a neutral block result.
   *
   * @param input - Source block input.
   * @param box - Neutral block result.
   * @returns Consumer result retaining the neutral geometry.
   */
  readonly decorateBox: (input: Input, box: QuireBlockFlowBox) => Box;
}

/** Options for laying out one consumer-neutral block container. */
export interface LayoutQuireBlockFlowContainerOptions<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> extends QuireBlockFlowServices<Input, Box> {
  /** Stable container identity. */
  readonly id: string;
  /** Document range represented by the container. */
  readonly range: QuireDocumentRange;
  /** Container origin and available width. */
  readonly rect: QuireRect;
  /** Default extent for unmeasured leaves. */
  readonly blockHeight: number;
  /** Gap between recursive siblings. */
  readonly blockGap: number;
  /** Available parent fragment extent, when bounded. */
  readonly fragmentBlockSize?: number | undefined;
  /** Child inputs in source order. */
  readonly children: readonly Input[];
}

/** Options for laying out one consumer-neutral block input. */
export interface LayoutQuireBlockFlowInputOptions<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> extends QuireBlockFlowServices<Input, Box> {
  /** Block input to lay out. */
  readonly input: Input;
  /** Resolved horizontal origin. */
  readonly x: number;
  /** Resolved vertical origin. */
  readonly y: number;
  /** Available inline size. */
  readonly width: number;
  /** Default extent for unmeasured leaves. */
  readonly blockHeight: number;
  /** Gap between recursive siblings. */
  readonly blockGap: number;
  /** Available parent fragment extent, when bounded. */
  readonly fragmentBlockSize?: number | undefined;
}
