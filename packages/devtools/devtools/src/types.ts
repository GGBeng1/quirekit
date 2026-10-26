import type { CanvasMountedViewRenderEvent, QuireMountedViewRenderEvent, QuireViewRenderCacheCounters } from "@quirekit/view";
import type { HtmlMountedViewRuntimeOptions } from "@quirekit/view-html";
import type {
  QuireAnyExtension,
  QuireEditor,
  QuireJSONContent
} from "@quirekit/core";

/** Existing retained HTML diagnostics callback shape. */
type QuireDevtoolsHtmlRenderDiagnostics = Parameters<
  NonNullable<HtmlMountedViewRuntimeOptions["onRender"]>
>[0]["diagnostics"];

/** Canonical update patch carried by a mounted render event. */
type QuireDevtoolsMountedUpdatePatch = NonNullable<
  QuireMountedViewRenderEvent["renderResult"]["updatePatch"]
>;

/** Clock function used by devtools for deterministic timing. */
export type QuireDevtoolsClock = () => number;

/** Options used to create a QuireKit devtools instance. */
export interface QuireDevtoolsOptions {
  /** Whether diagnostics should record entries. Defaults to true. */
  readonly enabled?: boolean | undefined;
  /** Maximum number of entries retained in memory. Defaults to 500. */
  readonly maxEntries?: number | undefined;
  /** Duration in milliseconds after which an entry is considered slow. */
  readonly slowThresholdMs?: number | undefined;
  /** Optional clock used for tests or custom timing sources. */
  readonly clock?: QuireDevtoolsClock | undefined;
}

/** Data captured before an editor operation starts. */
export interface QuireDevtoolsOperationInput {
  /** Operation source label. Defaults to `transaction`. */
  readonly source?: string | undefined;
  /** Number of transaction steps on the primary transaction. */
  readonly stepCount?: number | undefined;
  /** Whether the primary transaction changed the document. */
  readonly docChanged?: boolean | undefined;
  /** Whether the primary transaction changed selection. */
  readonly selectionSet?: boolean | undefined;
  /** Transaction metadata keys visible through ProseMirror's runtime object. */
  readonly metaKeys?: readonly string[] | undefined;
  /** Structured transaction details used for operation debugging. */
  readonly details?: QuireDevtoolsOperationDetails | undefined;
  /** Browser interaction that most recently preceded this operation. */
  readonly trigger?: QuireDevtoolsOperationTriggerSummary | undefined;
}

/** Measured phase timing attached to operation or render diagnostics. */
export interface QuireDevtoolsMeasuredPhase {
  /** Stable phase name shown in diagnostics. */
  readonly name: string;
  /** Phase start time in milliseconds according to the diagnostic clock. */
  readonly startedAt: number;
  /** Phase end time in milliseconds according to the diagnostic clock. */
  readonly endedAt: number;
  /** Phase duration in milliseconds. */
  readonly durationMs: number;
}

/** Data captured when an editor operation finishes. */
export interface QuireDevtoolsOperationFinishInput {
  /** Optional measured phases observed during this operation. */
  readonly phases?: readonly QuireDevtoolsMeasuredPhase[] | undefined;
}

/** Opaque token returned when an operation timing window starts. */
export interface QuireDevtoolsOperationToken {
  /** Operation source label. */
  readonly source: string;
  /** Number of transaction steps on the primary transaction. */
  readonly stepCount: number;
  /** Whether the primary transaction changed the document. */
  readonly docChanged: boolean;
  /** Whether the primary transaction changed selection. */
  readonly selectionSet: boolean;
  /** Transaction metadata keys visible through ProseMirror's runtime object. */
  readonly metaKeys: readonly string[];
  /** Structured transaction details used for operation debugging. */
  readonly details?: QuireDevtoolsOperationDetails | undefined;
  /** Browser interaction that most recently preceded this operation. */
  readonly trigger?: QuireDevtoolsOperationTriggerSummary | undefined;
  /** Operation start time in milliseconds according to the configured clock. */
  readonly startedAt: number;
}

/** Compact browser interaction summary attached to an operation. */
export interface QuireDevtoolsOperationTriggerSummary {
  /** Browser event source that started the interaction. */
  readonly source: QuireDevtoolsInteractionSource;
  /** Short event label shown in the panel. */
  readonly label?: string | undefined;
  /** Keyboard key when the interaction came from a keyboard event. */
  readonly key?: string | undefined;
  /** Input event type when the interaction came from beforeinput/input. */
  readonly inputType?: string | undefined;
  /** Compact target label for the element receiving the browser event. */
  readonly target?: string | undefined;
}

/** Compact metadata value summary attached to a transaction operation. */
export interface QuireDevtoolsOperationMetaSummary {
  /** Metadata key. */
  readonly key: string;
  /** JavaScript value type or constructor name. */
  readonly valueType: string;
  /** Short display preview for the metadata value. */
  readonly preview: string;
}

/** Compact ProseMirror step summary attached to a transaction operation. */
export interface QuireDevtoolsOperationStepSummary {
  /** Step index within the transaction. */
  readonly index: number;
  /** Step type from `step.toJSON().stepType` or the constructor name. */
  readonly type: string;
  /** Start position for range-based steps. */
  readonly from?: number | undefined;
  /** End position for range-based steps. */
  readonly to?: number | undefined;
  /** Single position for point-based steps. */
  readonly position?: number | undefined;
  /** Start of a replace-around preserved gap. */
  readonly gapFrom?: number | undefined;
  /** End of a replace-around preserved gap. */
  readonly gapTo?: number | undefined;
  /** Approximate deleted content size. */
  readonly deletedSize?: number | undefined;
  /** Approximate inserted slice size. */
  readonly insertedSize?: number | undefined;
  /** Attribute name for attribute steps. */
  readonly attr?: string | undefined;
  /** Mark type name for mark steps. */
  readonly mark?: string | undefined;
  /** Node type names found in an inserted slice. */
  readonly nodeTypes?: readonly string[] | undefined;
  /** Short text preview found in an inserted slice. */
  readonly textPreview?: string | undefined;
}

/** Compact changed range summary for a transaction operation. */
export interface QuireDevtoolsOperationChangedRangeSummary {
  /** Start position of changed content in post-transform coordinates. */
  readonly from: number;
  /** End position of changed content in post-transform coordinates. */
  readonly to: number;
}

/** Structured transaction details attached to an operation entry. */
export interface QuireDevtoolsOperationDetails {
  /** Transaction timestamp when available. */
  readonly transactionTime?: number | undefined;
  /** Starting document size in ProseMirror positions. */
  readonly docBeforeSize?: number | undefined;
  /** Ending document size in ProseMirror positions. */
  readonly docAfterSize?: number | undefined;
  /** Whether stored marks were explicitly updated. */
  readonly storedMarksSet?: boolean | undefined;
  /** Final selection type name. */
  readonly selectionType?: string | undefined;
  /** Final selection start position. */
  readonly selectionFrom?: number | undefined;
  /** Final selection end position. */
  readonly selectionTo?: number | undefined;
  /** Final selection anchor position. */
  readonly selectionAnchor?: number | undefined;
  /** Final selection head position. */
  readonly selectionHead?: number | undefined;
  /** Post-transform changed range when available. */
  readonly changedRange?: QuireDevtoolsOperationChangedRangeSummary | undefined;
  /** Metadata value summaries. */
  readonly meta: readonly QuireDevtoolsOperationMetaSummary[];
  /** Step summaries. */
  readonly steps: readonly QuireDevtoolsOperationStepSummary[];
}

/** Common fields shared by all recorded devtools entries. */
export interface QuireDevtoolsEntryBase {
  /** Monotonic entry id assigned by the recorder. */
  readonly id: number;
  /** Entry discriminator. */
  readonly kind: "operation" | "render" | "interaction";
  /** Entry start time in milliseconds according to the configured clock. */
  readonly startedAt: number;
  /** Entry end time in milliseconds according to the configured clock. */
  readonly endedAt: number;
  /** Total duration in milliseconds. */
  readonly durationMs: number;
  /** Whether the duration is an explicitly measured timing window. */
  readonly measured: boolean;
  /** Whether the entry duration crossed the configured slow threshold. */
  readonly slow: boolean;
}

/** One editor operation observed around transaction dispatch. */
export interface QuireDevtoolsOperationEntry extends QuireDevtoolsEntryBase {
  /** Entry discriminator. */
  readonly kind: "operation";
  /** Whether the duration is an explicitly measured timing window. */
  readonly measured: true;
  /** Operation source label. */
  readonly source: string;
  /** Number of transaction steps on the primary transaction. */
  readonly stepCount: number;
  /** Whether the primary transaction changed the document. */
  readonly docChanged: boolean;
  /** Whether the primary transaction changed selection. */
  readonly selectionSet: boolean;
  /** Transaction metadata keys visible through ProseMirror's public field. */
  readonly metaKeys: readonly string[];
  /** Structured transaction details used for operation debugging. */
  readonly details?: QuireDevtoolsOperationDetails | undefined;
  /** Browser interaction that most recently preceded this operation. */
  readonly trigger?: QuireDevtoolsOperationTriggerSummary | undefined;
  /** Measured phases observed during this operation. */
  readonly phases?: readonly QuireDevtoolsMeasuredPhase[] | undefined;
}

/** Rectangle summary used by render diagnostics. */
export interface QuireDevtoolsRectSummary {
  /** Left coordinate in CSS pixels. */
  readonly x: number;
  /** Top coordinate in CSS pixels. */
  readonly y: number;
  /** Width in CSS pixels. */
  readonly width: number;
  /** Height in CSS pixels. */
  readonly height: number;
}

/** Update patch details extracted from a render result. */
export interface QuireDevtoolsUpdatePatchSummary {
  /** Mounted backend update reason, when provided. */
  readonly sourceReason?: string | undefined;
  /** Number of transactions folded into the render update. */
  readonly transactionCount: number;
  /** Whether any folded transaction changed document content. */
  readonly docChanged: boolean;
  /** Whether the update changed editor selection or caret state. */
  readonly selectionChanged: boolean;
  /** Whether the update changed IME composition state. */
  readonly compositionChanged: boolean;
  /** Canonical invalidation causes. */
  readonly causes: QuireDevtoolsMountedUpdatePatch["causes"];
  /** Retained products invalidated by the update. */
  readonly invalidatedProducts: QuireDevtoolsMountedUpdatePatch["invalidatedProducts"];
}

/** Render metrics extracted from a mounted view render event. */
export interface QuireDevtoolsRenderSummary {
  /** Mounted view identifier. */
  readonly viewId: string;
  /** Mounted view mode such as canvas, svg, or html. */
  readonly mode: string;
  /** Render scheduling reason when provided by the runtime. */
  readonly reason?: string | undefined;
  /** Render strategy selected by the runtime when available. */
  readonly strategy?: string | undefined;
  /** Number of display commands in the full display list. */
  readonly commandCount: number;
  /** Number of top-level layout blocks in the snapshot. */
  readonly blockCount: number;
  /** Number of caret geometries in the render result. */
  readonly caretCount: number;
  /** Number of selection range geometries in the render result. */
  readonly selectionRangeCount: number;
  /** Number of DOM overlays produced by the render pass. */
  readonly overlayCount: number;
  /** Document rectangle from the latest layout snapshot. */
  readonly documentRect: QuireDevtoolsRectSummary;
  /** Viewport rectangle used by the mounted render pass. */
  readonly viewportRect: QuireDevtoolsRectSummary;
  /** Mounted content surface width in CSS pixels. */
  readonly displayWidth: number;
  /** Mounted content surface height in CSS pixels. */
  readonly displayHeight: number;
  /** Device pixel ratio used by the mounted render pass when available. */
  readonly devicePixelRatio?: number | undefined;
  /** Measured render duration when the runtime reports phase timings. */
  readonly durationMs?: number | undefined;
  /** Measured phases observed during the render pass. */
  readonly phases?: readonly QuireDevtoolsMeasuredPhase[] | undefined;
  /** Cache counters sampled after the render artifacts were built. */
  readonly cacheCounters?: QuireViewRenderCacheCounters | undefined;
  /** Cache counter deltas compared with the previous render from the same view. */
  readonly cacheCounterDelta?: QuireViewRenderCacheCounters | undefined;
  /** Display chunk production counters sampled from the render result. */
  readonly displayChunkCounters?:
    QuireMountedViewRenderEvent["renderResult"]["displayChunkCounters"] | undefined;
  /** Retained display-owner compilation and invalidation diagnostics. */
  readonly displayOwnerDiagnostics?:
    QuireMountedViewRenderEvent["renderResult"]["displayOwnerDiagnostics"] | undefined;
  /** Typed update patch summarized from the render result, when available. */
  readonly updatePatch?: QuireDevtoolsUpdatePatchSummary | undefined;
  /** Retained HTML scheduler and bounded-mutation evidence when available. */
  readonly retainedHtml?: QuireDevtoolsHtmlRenderDiagnostics | undefined;
  /** Retained Canvas page content bitmap diagnostics when available. */
  readonly pageContentCache?: CanvasMountedViewRenderEvent["pageContentCache"] | undefined;
}

/** One mounted view render entry. */
export interface QuireDevtoolsRenderEntry extends QuireDevtoolsEntryBase {
  /** Entry discriminator. */
  readonly kind: "render";
  /** Whether the duration is an explicitly measured timing window. */
  readonly measured: boolean;
  /** Render metrics extracted from the mounted view. */
  readonly render: QuireDevtoolsRenderSummary;
}

/** Browser interaction source observed by the devtools latency tracer. */
export type QuireDevtoolsInteractionSource =
  | "beforeinput"
  | "click"
  | "compositionend"
  | "compositionstart"
  | "input"
  | "keydown"
  | "pointerdown"
  | "pointermove";

/** Data captured when a browser interaction starts. */
export interface QuireDevtoolsInteractionInput {
  /** Browser event source that started the trace. */
  readonly source: QuireDevtoolsInteractionSource;
  /** Short event label shown in the panel. */
  readonly label?: string | undefined;
  /** Keyboard key when the interaction came from a keyboard event. */
  readonly key?: string | undefined;
  /** Input event type when the interaction came from beforeinput/input. */
  readonly inputType?: string | undefined;
  /** Compact target label for the element receiving the browser event. */
  readonly target?: string | undefined;
}

/** Opaque token returned when an interaction latency trace starts. */
export interface QuireDevtoolsInteractionToken {
  /** Browser event source that started the trace. */
  readonly source: QuireDevtoolsInteractionSource;
  /** Short event label shown in the panel. */
  readonly label?: string | undefined;
  /** Keyboard key when the interaction came from a keyboard event. */
  readonly key?: string | undefined;
  /** Input event type when the interaction came from beforeinput/input. */
  readonly inputType?: string | undefined;
  /** Compact target label for the element receiving the browser event. */
  readonly target?: string | undefined;
  /** Interaction start time in milliseconds according to the configured clock. */
  readonly startedAt: number;
}

/** Data captured when an interaction latency trace finishes. */
export interface QuireDevtoolsInteractionFinishInput {
  /** Whether the trace reached a render-settled frame. */
  readonly settled: boolean;
  /** Number of transaction operation entries observed after the interaction began. */
  readonly operationCount: number;
  /** Number of render entries observed after the interaction began. */
  readonly renderCount: number;
  /** Operation entry ids observed during this interaction trace. */
  readonly operationEntryIds?: readonly number[] | undefined;
  /** Render entry ids observed during this interaction trace. */
  readonly renderEntryIds?: readonly number[] | undefined;
  /** Render entry id that settled this trace, when available. */
  readonly renderEntryId?: number | undefined;
}

/** One input-to-render latency trace observed from the mounted editor host. */
export interface QuireDevtoolsInteractionEntry extends QuireDevtoolsEntryBase {
  /** Entry discriminator. */
  readonly kind: "interaction";
  /** Whether the duration is an explicitly measured timing window. */
  readonly measured: true;
  /** Browser event source that started the trace. */
  readonly source: QuireDevtoolsInteractionSource;
  /** Short event label shown in the panel. */
  readonly label?: string | undefined;
  /** Keyboard key when the interaction came from a keyboard event. */
  readonly key?: string | undefined;
  /** Input event type when the interaction came from beforeinput/input. */
  readonly inputType?: string | undefined;
  /** Compact target label for the element receiving the browser event. */
  readonly target?: string | undefined;
  /** Whether the trace reached a render-settled frame. */
  readonly settled: boolean;
  /** Number of transaction operation entries observed after the interaction began. */
  readonly operationCount: number;
  /** Number of render entries observed after the interaction began. */
  readonly renderCount: number;
  /** Operation entry ids observed during this interaction trace. */
  readonly operationEntryIds?: readonly number[] | undefined;
  /** Render entry ids observed during this interaction trace. */
  readonly renderEntryIds?: readonly number[] | undefined;
  /** Render entry id that settled this trace, when available. */
  readonly renderEntryId?: number | undefined;
}

/** Union of all devtools entries. */
export type QuireDevtoolsEntry =
  | QuireDevtoolsInteractionEntry
  | QuireDevtoolsOperationEntry
  | QuireDevtoolsRenderEntry;

/** Selection information exposed in the current snapshot. */
export interface QuireDevtoolsSelectionSummary {
  /** Selection start position. */
  readonly from: number;
  /** Selection end position. */
  readonly to: number;
  /** Whether the selection is collapsed. */
  readonly empty: boolean;
  /** Selection anchor when provided by the PM selection type. */
  readonly anchor?: number | undefined;
  /** Selection head when provided by the PM selection type. */
  readonly head?: number | undefined;
}

/** Schema information exposed in the current snapshot. */
export interface QuireDevtoolsSchemaSummary {
  /** Top node type name. */
  readonly topNode: string;
  /** Schema node type names. */
  readonly nodes: readonly string[];
  /** Schema mark type names. */
  readonly marks: readonly string[];
}

/** Options used when reading a devtools snapshot. */
export interface QuireDevtoolsSnapshotOptions {
  /** Whether to include `editor.getJSON()` output. */
  readonly includeJSON?: boolean | undefined;
  /** Whether to include debug JSON annotated with document positions. */
  readonly includeDebugJSON?: boolean | undefined;
}

/** Current editor state summary exposed by devtools. */
export interface QuireDevtoolsSnapshot {
  /** Whether an editor is currently attached to the devtools instance. */
  readonly attached: boolean;
  /** Current document size in ProseMirror positions. */
  readonly docSize: number;
  /** Current plain text length. */
  readonly textLength: number;
  /** Current selection summary, when an editor is attached. */
  readonly selection?: QuireDevtoolsSelectionSummary | undefined;
  /** Current schema summary, when an editor is attached. */
  readonly schema?: QuireDevtoolsSchemaSummary | undefined;
  /** Installed extension names in execution order. */
  readonly extensionNames: readonly string[];
  /** Installed ProseMirror plugin keys. */
  readonly pluginKeys: readonly string[];
  /** Extension storage keys. */
  readonly storageKeys: readonly string[];
  /** Optional document JSON. */
  readonly document?: QuireJSONContent | undefined;
  /** Optional debug JSON annotated with document positions. */
  readonly debugDocument?: QuireJSONContent | undefined;
  /** Latest render summary, when any render has been recorded. */
  readonly latestRender?: QuireDevtoolsRenderSummary | undefined;
}

/** Listener called when devtools entries or snapshots change. */
export type QuireDevtoolsSubscriber = () => void;

/** Subscription handle returned by `subscribe`. */
export interface QuireDevtoolsSubscription {
  /** Removes the subscriber. */
  unsubscribe(): void;
}

/** Mounted panel handle. */
export interface QuireDevtoolsMount {
  /** Removes panel DOM and subscriptions. */
  destroy(): void;
}

/** Headless recorder used by QuireKit devtools adapters. */
export interface QuireDevtoolsRecorder {
  /**
   * Starts timing an editor operation.
   *
   * @param input - Operation metadata to attach to the final entry.
   * @returns Opaque token to pass to `finishOperation`.
   */
  startOperation(input?: QuireDevtoolsOperationInput): QuireDevtoolsOperationToken;
  /**
   * Finishes timing an editor operation and stores the entry.
   *
   * @param token - Operation token returned by `startOperation`.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  finishOperation(
    token: QuireDevtoolsOperationToken,
    input?: QuireDevtoolsOperationFinishInput
  ): QuireDevtoolsOperationEntry | undefined;
  /**
   * Records a mounted view render summary.
   *
   * @param summary - Render metrics extracted from a mounted render event.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  recordRender(
    summary: QuireDevtoolsRenderSummary
  ): QuireDevtoolsRenderEntry | undefined;
  /**
   * Starts timing a browser interaction-to-render trace.
   *
   * @param input - Interaction metadata to attach to the final entry.
   * @returns Opaque token to pass to `finishInteraction`.
   */
  startInteraction(input: QuireDevtoolsInteractionInput): QuireDevtoolsInteractionToken;
  /**
   * Finishes timing a browser interaction-to-render trace.
   *
   * @param token - Interaction token returned by `startInteraction`.
   * @param input - Trace completion metadata.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  finishInteraction(
    token: QuireDevtoolsInteractionToken,
    input: QuireDevtoolsInteractionFinishInput
  ): QuireDevtoolsInteractionEntry | undefined;
  /**
   * Reads current devtools entries.
   *
   * @returns Recent devtools entries in chronological order.
   */
  getEntries(): readonly QuireDevtoolsEntry[];
  /**
   * Subscribes to recorder changes.
   *
   * @param subscriber - Listener invoked after entries change.
   * @returns Subscription handle.
   */
  subscribe(subscriber: QuireDevtoolsSubscriber): QuireDevtoolsSubscription;
  /** Clears recorded entries without removing subscribers. */
  clear(): void;
  /** Clears recorded entries and removes all subscribers. */
  destroy(): void;
}

/** Public QuireKit devtools instance. */
export interface QuireDevtools {
  /**
   * Creates the editor extension that attaches the recorder to an editor.
   *
   * @returns Extension to include in the editor extension list.
   */
  extension(): QuireAnyExtension;
  /**
   * Records any mounted view render event.
   *
   * @param event - Mounted render event emitted by `@quirekit/view`.
   */
  onRender(event: QuireMountedViewRenderEvent): void;
  /**
   * Records a Canvas mounted view render event.
   *
   * @param event - Canvas render event emitted by `@quirekit/view`.
   */
  onCanvasRender(event: CanvasMountedViewRenderEvent): void;
  /**
   * Observes browser interactions inside an editor host for input-to-render traces.
   *
   * @param element - Element whose input and pointer events should be traced.
   * @returns Mounted observer handle.
   */
  observeInteractions(element: HTMLElement): QuireDevtoolsMount;
  /**
   * Reads current devtools entries.
   *
   * @returns Recent devtools entries in chronological order.
   */
  getEntries(): readonly QuireDevtoolsEntry[];
  /** Clears all recorded entries (timeline, interactions, renders). */
  clear(): void;
  /**
   * Reads a current editor snapshot.
   *
   * @param options - Snapshot detail options.
   * @returns Current editor and render summary.
   */
  getSnapshot(options?: QuireDevtoolsSnapshotOptions): QuireDevtoolsSnapshot;
  /**
   * Subscribes to devtools changes.
   *
   * @param subscriber - Listener invoked after entries or snapshots change.
   * @returns Subscription handle.
   */
  subscribe(subscriber: QuireDevtoolsSubscriber): QuireDevtoolsSubscription;
  /**
   * Mounts the framework-neutral devtools panel.
   *
   * @param element - Host element that receives the panel mount root.
   * @returns Mounted panel handle.
   */
  mountPanel(element: HTMLElement): QuireDevtoolsMount;
  /**
   * Attaches an editor to the devtools instance.
   *
   * @param editor - Editor to inspect.
   */
  attachEditor(editor: QuireEditor): void;
  /** Clears the attached editor, entries, and panel state. */
  destroy(): void;
}
