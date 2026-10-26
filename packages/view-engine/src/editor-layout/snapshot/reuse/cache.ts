import { readQuireEditorLayoutAuthority } from "@quirekit/core";
import { shouldMaterializeQuireSelectionTextblock } from "../../../interaction/selection/materialization";
import type { QuireRetainedBlockLayoutGraph } from "../../../layout/retained-block";
import type { QuireLayoutSnapshot, QuireLayoutSnapshotOptions, QuireRetainedLayoutSnapshot } from "../../types";
import {
  captureQuireLayoutInputIdentities,
  captureQuireLayoutInputSignature,
  captureQuireLayoutProjectionSignature,
  hasQuireStableLayoutServices
} from "./inputs";
import type {
  QuireLayoutProduct,
  QuireLayoutProductAttempt,
  QuireLayoutProductCache,
  QuireLayoutProductCandidate,
  QuireLayoutProductCounters
} from "./types";

const lanes = new WeakMap<QuireRetainedBlockLayoutGraph, QuireLayoutProductCache>();
const candidates = new WeakMap<QuireRetainedLayoutSnapshot["root"], QuireLayoutProductCandidate>();

/**
 * Reads the canonical source owned by an unchanged snapshot, including state-only spreads.
 * @param snapshot - Retained layout or interaction geometry being queried.
 * @returns Matching immutable geometry authority, without promoting its cache lane.
 */
export function readQuireLayoutProductCandidate(snapshot: QuireLayoutSnapshot): QuireLayoutProductCandidate | undefined {
  const candidate = candidates.get(snapshot.root);
  return candidate?.options.state.doc === snapshot.state.doc && candidate?.options.editor?.isDestroyed !== true
    ? candidate : undefined;
}

/**
 * Captures exact dependencies before any layout or decoration callback executes.
 *
 * @param options - Current state and complete layout inputs.
 * @param graph - Runtime-owned lane identity, or no cache for standalone builds.
 * @returns Generation-scoped attempt with optional reusable canonical geometry.
 */
export function prepareQuireLayoutProduct(
  options: QuireLayoutSnapshotOptions,
  graph?: QuireRetainedBlockLayoutGraph
): QuireLayoutProductAttempt {
  const cache = graph === undefined ? undefined : lanes.get(graph);
  const owner = cache ?? { generation: 0, counters: { rebuilt: 0, reused: 0, fallbackReason: "initial" } };
  if (graph !== undefined && cache === undefined) lanes.set(graph, owner);
  const generation = ++owner.generation;
  const inputs = captureInputs(options);
  const reason = admissionFailure(owner.accepted, options, inputs);
  owner.counters = {
    rebuilt: owner.counters.rebuilt + Number(reason !== null),
    reused: owner.counters.reused + Number(reason === null),
    fallbackReason: reason
  };
  return {
    cache: owner, generation, options, ...inputs,
    ...(reason === null ? { reusedProduct: owner.accepted!.product } : {})
  };
}

/**
 * Associates the adapted root with its unpublished complete geometry candidate.
 *
 * @param snapshot - Fresh adaptation, never an in-place mutation of old geometry.
 * @param product - Canonical geometry compiled or reused by this attempt.
 * @param attempt - Inputs captured before external callback execution.
 */
export function retainQuireLayoutProductCandidate(
  snapshot: QuireRetainedLayoutSnapshot,
  product: QuireLayoutProduct,
  attempt: QuireLayoutProductAttempt
): void {
  candidates.set(snapshot.root, {
    ...attempt, product, snapshot,
    selectionSensitive: snapshot.viewGraph.regions.some((region) => region.ref.kind === "drawing-text")
  });
}

/**
 * Publishes only the latest successful full-frame candidate in its own lane.
 *
 * @param snapshot - Geometry whose entire display/decorations frame completed.
 */
export function confirmQuireLayoutProductFrame(snapshot: QuireRetainedLayoutSnapshot): void {
  const candidate = candidates.get(snapshot.root);
  if (candidate !== undefined
    && candidate.generation === candidate.cache.generation
    && candidate.options.editor?.isDestroyed === false
    && candidate.options.editor.state === candidate.options.state) {
    candidate.cache.accepted = candidate;
  }
}

/**
 * Applies the same current-input proof to a mounted overlay-only snapshot.
 *
 * Root identity survives the mounted state-only snapshot spread. Drawing text
 * must still pass through fresh adaptation before any interaction projection.
 *
 * @param snapshot - Previously committed geometry.
 * @param options - Exact current state and complete current layout inputs.
 * @param selectionIndependent - Whether adaptation itself must be reusable.
 * @returns Whether the mounted caller can retain the snapshot geometry safely.
 */
export function canReuseQuireLayoutProductSnapshot(
  snapshot: QuireRetainedLayoutSnapshot,
  options: QuireLayoutSnapshotOptions,
  selectionIndependent: boolean
): boolean {
  const candidate = candidates.get(snapshot.root);
  if (candidate === undefined || candidate.cache.accepted !== candidate
    || (selectionIndependent && candidate.selectionSensitive)
    || candidate.product.projectionSignature !== captureQuireLayoutProjectionSignature(options)) return false;
  const generation = candidate.cache.generation;
  const currentOptions = { ...options, editor: candidate.options.editor };
  const reason = admissionFailure(candidate, currentOptions, captureInputs(currentOptions));
  // Live dependency readers can reenter; only the unchanged committed owner may
  // authorize skipping adaptation after every external read has completed.
  return reason === null && candidate.cache.accepted === candidate
    && candidate.product.projectionSignature === captureQuireLayoutProjectionSignature(options)
    && candidate.cache.generation === generation
    && candidate.options.editor?.isDestroyed === false
    && candidate.options.editor.state === options.state;
}

/**
 * Samples actual work without exposing the lane's mutable counter object.
 *
 * @param graph - Runtime-owned accepted or transient lane.
 * @returns Independent cumulative counters and latest admission reason.
 */
export function snapshotQuireLayoutProductCounters(graph: QuireRetainedBlockLayoutGraph): QuireLayoutProductCounters {
  return { ...(lanes.get(graph)?.counters ?? { rebuilt: 0, reused: 0, fallbackReason: "initial" }) };
}

/**
 * Captures live authority tokens and bounded metric values for one comparison.
 *
 * @param options - Exact current state and layout configuration.
 * @returns Owned comparison values; callbacks are never memoized here.
 */
function captureInputs(options: QuireLayoutSnapshotOptions) {
  const authority = options.editor === undefined
    ? { known: false as const, reason: "missing-editor" }
    : readQuireEditorLayoutAuthority(options.editor, options.state);
  return {
    authority: authority.known ? { ...authority, tokens: [...authority.tokens] } : authority,
    signature: captureQuireLayoutInputSignature(options),
    identities: captureQuireLayoutInputIdentities(options)
  };
}

/**
 * Rejects updates lacking positive proof for every geometry dependency.
 *
 * @param previous - Last successful candidate in the exact runtime lane.
 * @param options - Complete current layout inputs.
 * @param inputs - Fresh captured authority and bounded values.
 * @returns First admission failure, or null when all evidence agrees.
 */
function admissionFailure(
  previous: QuireLayoutProductCandidate | undefined,
  options: QuireLayoutSnapshotOptions,
  inputs: ReturnType<typeof captureInputs>
): string | null {
  if (options.editor?.isDestroyed === true) return "destroyed";
  if (previous === undefined) return "initial";
  const patch = options.updatePatch;
  if (patch == null) return "missing-patch";
  if (options.transientPreview === true) return "transient-preview";
  // Scroll and fixed-target image paint may request canonical reuse. Live
  // provider, resource and geometry authority must independently prove it safe.
  const geometryIndependent = (patch.sourceReason === "scroll" || patch.sourceReason === "image-paint")
    && patch.transactionCount === 0;
  const stateOnly = patch.selectionChanged || patch.causes.includes("presentation") || geometryIndependent;
  if (!stateOnly || patch.docChanged || patch.compositionChanged
    || patch.invalidatedProducts.includes("layout") || options.layoutDirtyRange != null
    || (patch.sourceReason !== "selection" && patch.sourceReason !== "transaction" && !geometryIndependent)) return "update-patch";
  if (!inputs.authority.known) return inputs.authority.reason;
  if (!previous.authority.known || !equalTokens(previous.authority.tokens, inputs.authority.tokens)) return "layout-authority";
  if (!hasQuireStableLayoutServices(options)) return "unversioned-layout-service";
  if (options.state.doc !== previous.options.state.doc || inputs.signature !== previous.signature
    || !equalTokens(previous.identities, inputs.identities)) return "layout-inputs";
  const selection = options.state.pm.selection;
  if (((options.maxBlocks !== undefined || options.maxShapedBlockExtent !== undefined)
      && !selection.$head.parent.isTextblock)
    || (shouldMaterializeQuireSelectionTextblock({ snapshot: previous.snapshot, selection })
      && shouldMaterializeQuireSelectionTextblock({
        snapshot: { root: previous.product.sourceDocument }, selection
      }))) return "selection-unmaterialized";
  return null;
}

/**
 * Compares copied identity/version tokens without inspecting mutable payloads.
 *
 * @param left - Tokens captured with accepted geometry.
 * @param right - Fresh current authority tokens.
 * @returns Whether every explicitly declared dependency is identical.
 */
function equalTokens(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}
