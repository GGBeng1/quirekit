import { prepareQuireLayoutProduct, retainQuireLayoutProductCandidate } from "./reuse/cache";
import { compileSectionLayouts } from "./sections/compile";
import type { QuireLayoutProduct } from "./reuse/types";
import { captureQuireLayoutProjectionSignature } from "./reuse/inputs";
import { adaptQuireLayoutDocumentToSnapshot } from "../adapter";
import type { QuireLayoutSnapshotOptions, QuireRetainedLayoutSnapshot } from "../types";
import { createQuireRetainedBlockLayoutGraph, type QuireRetainedBlockLayoutGraph } from "../../layout/retained-block";
import type { QuirePageSection } from "../../document-profile/types";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { traceQuireLayoutStage } from "./trace";
import { resolveQuireDocumentProfile } from "../../document-profile";
import { createQuireSelectionStructureIntervalIndex } from "../../interaction/selection/structure";
import { bindLayoutPart, compileLayoutPart, compileLayoutPartSource } from "./part";
import { QuireSectionPassReuse } from "./sections/pass-reuse";
import { convergeQuirePaginationText } from "./occurrence-text/converge";
import { deriveQuirePaginationText } from "./occurrence-text/derive";
import { QuireStorySourceTable } from "./story-sources";

/**
 * Builds a layout snapshot through the recursive layout engine.
 *
 * @param options - State and viewport inputs for layout snapshot creation.
 * @param retainedBlockGraph - Runtime-owned accepted or transient layout lane.
 * @returns Layout snapshot adapted from the renderer-neutral layout document.
 */
export function buildEngineLayoutSnapshot(
  options: QuireLayoutSnapshotOptions,
  retainedBlockGraph?: QuireRetainedBlockLayoutGraph
): QuireRetainedLayoutSnapshot {
  // Own the window before dependency readers or trace callbacks can mutate the
  // caller's rectangles, so projection and adaptation consume the same inputs.
  options = { ...options, snapshotClipRects: options.snapshotClipRects?.map(rect => ({ ...rect })) };
  const attempt = prepareQuireLayoutProduct(options, retainedBlockGraph);
  let product = attempt.reusedProduct ?? compileEngineLayoutProduct(options, retainedBlockGraph);
  const projectionSignature = captureQuireLayoutProjectionSignature(options);
  // A retained layout owns complete flow/page facts. A changed window must
  // project those facts again before adaptation exposes its current hit geometry.
  if (product.projectionSignature !== projectionSignature) {
    product = { ...product, projectionSignature, document: product.projectDocument(options) };
  }
  const snapshot = traceQuireLayoutStage(options.trace, "layout:adapt", () =>
    adaptQuireLayoutDocumentToSnapshot({
      ...product,
      state: options.state,
      viewportRect: options.viewportRect,
      documentProfile: resolveQuireDocumentProfile(options.editor?.extensionManager),
      ...(options.snapshotClipRects === undefined ? {} : { snapshotClipRects: options.snapshotClipRects })
    }));
  retainQuireLayoutProductCandidate(snapshot, product, attempt);
  return snapshot;
}

/**
 * Compiles canonical geometry before any selection-sensitive adaptation.
 *
 * @param options - Exact source state and layout services.
 * @param retainedBlockGraph - Runtime-owned accepted or transient layout cache.
 * @returns Completed document and retained projection authority.
 */
function compileEngineLayoutProduct(
  options: QuireLayoutSnapshotOptions,
  retainedBlockGraph?: QuireRetainedBlockLayoutGraph
): QuireLayoutProduct {
  const { pageModel } = resolveQuireDocumentProfile(options.editor?.extensionManager);
  const sections = pageModel.listSections(options.state.doc);
  const lanes = retainedBlockGraph === undefined ? undefined : new QuireLayoutLanes(retainedBlockGraph, sections, options);
  const passes = new QuireSectionPassReuse(pageModel);
  const stories = new QuireStorySourceTable();
  const converge = () => convergeQuirePaginationText(values => {
    // A candidate text map is a full shaping dependency. Reuse of dirty-range
    // checkpoints would otherwise skip text whose source node did not change.
    const input = values ? { ...options, layoutDirtyRange: undefined, paginationCheckpointStore: undefined } : options;
    return sections.length > 1
      ? compileSectionLayouts(input, sections, pageModel, (sectionInput, context) => bindLayoutPart(passes.compile(sectionInput, context, values,
        recorded => compileLayoutPartSource(values ? sectionInput : rebaseSectionDirtyRange(sectionInput, context.section),
          lanes?.graph(context.section.index, values), context, recorded, stories)), context), true)
      : compileLayoutPart(input, values ? lanes?.graph(-1, values) : retainedBlockGraph, undefined, values, stories);
  }, product => deriveQuirePaginationText(product, pageModel, options.state.doc));
  const part = lanes === undefined ? converge() : lanes.guard(converge);
  const projected = { ...part, document: part.projectDocument(options) };
  const selectionStructureIndex = traceQuireLayoutStage(options.trace, "selection:compile-structure-index", () =>
    createQuireSelectionStructureIntervalIndex({ doc: options.state.doc, extensionManager: options.editor?.extensionManager }));
  return { ...projected, selectionStructureIndex };
}

/** One retained flow and the source and candidate text it last compiled. */
interface QuireLayoutLane {
  /** Retained graph owning this flow's records and inner caches. */
  readonly graph: QuireRetainedBlockLayoutGraph;
  /** Document of the lane's latest compile. */
  doc?: ProseMirrorNode;
  /** Candidate text map of the latest compile; absent for stored-text lanes. */
  values?: ReadonlyMap<string, string>;
}

/** Retained flows of each runtime lane and the document of its latest compile. */
const laneSets = new WeakMap<QuireRetainedBlockLayoutGraph, { doc?: ProseMirrorNode; lanes: Map<string, QuireLayoutLane> }>();

/**
 * Retained section and candidate-text flows for one canonical compile.
 *
 * Sections are independent flows, so each keeps its own graph. Candidate-text
 * passes measure field results that the source does not store; their graphs are
 * kept only across plain text edits of the source they last compiled with an
 * equal value map, because table cell products are keyed by node identity.
 */
class QuireLayoutLanes {
  /** Lane keys by section owner index; -1 is the single body flow. */
  private readonly keys = new Map<number, string>();
  /** Root lane set shared by every compile of this runtime lane. */
  private readonly set: { doc?: ProseMirrorNode; lanes: Map<string, QuireLayoutLane> };
  /** Lanes touched by this compile; the others are dropped once it succeeds. */
  private readonly used = new Map<string, QuireLayoutLane>();
  /** Whether candidate-text lanes may survive from the previous compile. */
  private readonly plainEdit: boolean;

  /**
   * @param root - Runtime-owned accepted or transient lane.
   * @param sections - Current sections in document order.
   * @param options - Exact source state and transaction dirty range.
   */
  constructor(private readonly root: QuireRetainedBlockLayoutGraph, sections: readonly QuirePageSection[], private readonly options: QuireLayoutSnapshotOptions) {
    this.set = laneSets.get(root) ?? { lanes: new Map() };
    laneSets.set(root, this.set);
    const dirty = options.layoutDirtyRange;
    this.plainEdit = this.set.doc !== undefined && dirty?.reason === "content" && dirty.textEdit !== undefined;
    this.keys.set(-1, "body");
    for (const section of sections) {
      // Keys only affect hit rate: every retained product is validated by content and geometry.
      let key = section.stableId ?? `#${section.index}`;
      while ([...this.keys.values()].includes(key)) key += "+";
      this.keys.set(section.index, key);
    }
  }

  /**
   * @param index - Section owner index, or -1 for the single body flow.
   * @param values - Candidate text of a convergence pass, absent for stored text.
   * @returns Graph to compile the flow with.
   */
  graph(index: number, values?: ReadonlyMap<string, string>): QuireRetainedBlockLayoutGraph {
    const key = `${values === undefined ? "s" : "v"}:${this.keys.get(index)}`;
    let lane = this.used.get(key) ?? this.set.lanes.get(key);
    const reusable = lane !== undefined && (values === undefined || (lane.doc === this.set.doc && this.plainEdit
      && lane.values?.size === values.size && [...values].every(([id, text]) => lane!.values!.get(id) === text)));
    if (!reusable) lane = { graph: createQuireRetainedBlockLayoutGraph() };
    lane!.doc = this.options.state.doc;
    if (values !== undefined) lane!.values = values;
    this.used.set(key, lane!);
    return lane!.graph;
  }

  /**
   * Runs one compile and publishes its lanes only when it completes.
   *
   * @param compile - Canonical compile using {@link graph}.
   * @returns Compile result.
   */
  guard<Result>(compile: () => Result): Result {
    try {
      const result = compile();
      this.set.lanes = this.used;
      this.set.doc = this.options.state.doc;
      return result;
    } catch (error) {
      // Graphs commit before pagination; a failed compile leaves no trusted lane.
      laneSets.delete(this.root);
      throw error;
    }
  }
}

/**
 * Expresses the first dirty top-level index relative to a section-filtered flow.
 *
 * @param options - Section compile inputs carrying the document-level dirty range.
 * @param section - Section whose owner sits at `section.index` among root children.
 * @returns Inputs whose dirty range compares against the section's local block indices.
 */
function rebaseSectionDirtyRange(options: QuireLayoutSnapshotOptions, section: QuirePageSection): QuireLayoutSnapshotOptions {
  const dirty = options.layoutDirtyRange;
  return dirty == null ? options
    : { ...options, layoutDirtyRange: { ...dirty, firstTopLevelBlockIndex: dirty.firstTopLevelBlockIndex - section.index } };
}

/**
 * Reads the retained section and candidate-text flows owned by one runtime lane, for diagnostics.
 *
 * @param root - Runtime-owned accepted or transient lane.
 * @returns Graphs used by the latest successful compile.
 */
export function listQuireSectionLayoutGraphs(root: QuireRetainedBlockLayoutGraph): readonly QuireRetainedBlockLayoutGraph[] {
  return [...laneSets.get(root)?.lanes.values() ?? []].map((lane) => lane.graph);
}
