import type { QuireLayoutDependency } from "../layout-dependency/types";
import type { Node as ProseMirrorNode } from "@quirekit/pm";

/** Default priority used when a selection adapter omits an explicit value. */
export const QUIRE_DEFAULT_SELECTION_ADAPTER_PRIORITY = 100;

/** Crossing behavior selected for one adapter-owned source region. */
export type QuireSelectionAdapterMode =
  | "delegate"
  | "semantic-units"
  | "owner"
  | "skip";

/** Crossing decisions compiled once for one selection adapter. */
export interface QuireSelectionAdapterModes {
  /** Behavior when both endpoints remain inside the same owner. */
  readonly internal: QuireSelectionAdapterMode;
  /** Behavior when a range enters the owner from surrounding text. */
  readonly entry: QuireSelectionAdapterMode;
  /** Behavior when a range exits the owner toward surrounding text. */
  readonly exit: QuireSelectionAdapterMode;
  /** Behavior when both endpoints are outside and fully cross the owner. */
  readonly fullyCrossed: QuireSelectionAdapterMode;
}

/** Context supplied while compiling semantic units from one source node. */
export interface QuireSelectionAdapterCompileContext {
  /** Exact ProseMirror node owned by the adapter. */
  readonly node: ProseMirrorNode;
  /** Absolute source position immediately before the owned node. */
  readonly position: number;
}

/** Owner-relative semantic unit returned by a selection adapter compiler. */
export interface QuireSelectionAdapterUnit {
  /** Stable id unique within one adapter-owned source node. */
  readonly id: string;
  /** Adapter-defined semantic kind consumed by commands and geometry. */
  readonly kind: string;
  /** Half-open source range relative to the start of the owner node. */
  readonly range: {
    /** Inclusive owner-relative start position. */
    readonly from: number;
    /** Exclusive owner-relative end position. */
    readonly to: number;
  };
}

/**
 * Renderer-neutral structured-selection behavior compiled at snapshot creation.
 *
 * The callback runs once per matching source node. Pointer movement consumes
 * immutable compiled facts and never invokes the extension callback.
 */
export interface QuireSelectionAdapter {
  /** Contract version understood by the current selection runtime. */
  readonly version: 1;
  /** Stable adapter id repeated by the Core registration envelope. */
  readonly id: string;
  /** ProseMirror node types repeated by the Core registration envelope. */
  readonly nodeTypes: readonly string[];
  /** Crossing decisions applied by the structured range planner. */
  readonly modes: QuireSelectionAdapterModes;
  /** Stable command domain used to route structural mutations. */
  readonly commandDomain: string;
  /** Stable clipboard domain used to serialize structural content. */
  readonly clipboardDomain: string;
  /** Safe fallback when mapped semantic units disappear. */
  readonly mappingFallback: "nearest" | "text" | "remove";
  /** Safe fallback when generic replacement cannot preserve the owner. */
  readonly replacementFallback: "owner" | "text" | "reject";
  /**
   * Compiles ordered semantic units for one adapter-owned source node.
   *
   * @param context - Exact node and absolute source position.
   * @returns Ordered owner-relative semantic units.
   */
  readonly compileUnits: (
    context: QuireSelectionAdapterCompileContext
  ) => readonly QuireSelectionAdapterUnit[];
}

/**
 * Renderer-neutral selection adapter registration owned by an extension.
 *
 * The generic payload is compiled by the selection runtime that understands
 * its semantic-unit contract. Core owns deterministic contribution ordering
 * without importing View Engine or renderer types.
 */
export interface QuireSelectionAdapterRegistration<Adapter = unknown> {
  /** Stable adapter identifier used by retained layout facts and diagnostics. */
  readonly id: string;
  /** ProseMirror node type names whose crossing semantics use this adapter. */
  readonly nodeTypes: readonly string[];
  /**
   * Adapter precedence for overlapping node-type claims.
   *
   * Higher values win. Omitted values use
   * `QUIRE_DEFAULT_SELECTION_ADAPTER_PRIORITY`.
   */
  readonly priority?: number | undefined;
  /** Runtime-owned adapter payload compiled outside editor core. */
  readonly adapter: Adapter;
  /** Optional proof covering this concrete adapter and semantic compiler. */
  readonly layoutDependency?: QuireLayoutDependency | undefined;
}

/** Typed contribution consumed by the progressive `addSelection()` hook. */
export type QuireSelectionContribution =
  QuireSelectionAdapterRegistration<QuireSelectionAdapter>;

/** Shared options accepted by every high-level selection preset. */
export interface QuireSelectionPresetOptions {
  /** Optional dependency proof, required for custom semantic-unit compilers. */
  readonly layoutDependency?: QuireLayoutDependency | undefined;
  /** Stable selection behavior id used by diagnostics and retained facts. */
  readonly id: string;
  /** ProseMirror node type names that use the preset behavior. */
  readonly nodeTypes: readonly string[];
  /** Optional precedence for overlapping node-type claims. */
  readonly priority?: number | undefined;
  /** Optional command routing domain; defaults to the preset id. */
  readonly commandDomain?: string | undefined;
  /** Optional clipboard routing domain; defaults to the preset id. */
  readonly clipboardDomain?: string | undefined;
}

/** Options for selecting an owner through ordered semantic units. */
export interface QuireSemanticUnitsSelectionPresetOptions
  extends QuireSelectionPresetOptions {
  /** Fallback used when mapped units disappear; defaults to text. */
  readonly mappingFallback?: "nearest" | "text" | "remove" | undefined;
  /** Generic replacement fallback; defaults to reject. */
  readonly replacementFallback?: "owner" | "text" | "reject" | undefined;
  /**
   * Compiles ordered semantic units for one matching source node.
   *
   * @param context - Exact node and absolute source position.
   * @returns Ordered owner-relative semantic units.
   */
  readonly compileUnits: (
    context: QuireSelectionAdapterCompileContext
  ) => readonly QuireSelectionAdapterUnit[];
}

/** Beginner-friendly preset factories for common structured selection behavior. */
export interface QuireSelectionPresetFactory {
  /**
   * Keeps an inline atom inside ordinary text-range semantics.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  readonly inline: (
    options: QuireSelectionPresetOptions
  ) => QuireSelectionContribution;
  /**
   * Delegates editable children and selects the whole container only when fully crossed.
   *
   * @param options - Stable container metadata.
   * @returns One typed selection contribution.
   */
  readonly container: (
    options: QuireSelectionPresetOptions
  ) => QuireSelectionContribution;
  /**
   * Selects an atomic block as one indivisible owner.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  readonly atomicBlock: (
    options: QuireSelectionPresetOptions
  ) => QuireSelectionContribution;
  /**
   * Promotes entry and exit to ordered semantic units.
   *
   * @param options - Owner metadata and semantic-unit compiler.
   * @returns One typed selection contribution.
   */
  readonly semanticUnits: (
    options: QuireSemanticUnitsSelectionPresetOptions
  ) => QuireSelectionContribution;
  /**
   * Excludes an owned source region from dragged range selection.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  readonly skip: (
    options: QuireSelectionPresetOptions
  ) => QuireSelectionContribution;
}

/** Selection adapter registration annotated with its extension owner. */
export interface QuireSelectionAdapterEntry<Adapter = unknown>
  extends QuireSelectionAdapterRegistration<Adapter> {
  /** Extension name that contributed the adapter. */
  readonly extensionName: string;
}

/** Duplicate stable adapter id discovered during registry compilation. */
export interface QuireDuplicateSelectionAdapterIdGap<Adapter = unknown> {
  /** Machine-readable gap code. */
  readonly code: "duplicate-selection-adapter-id";
  /** Stable id shared by multiple adapter registrations. */
  readonly id: string;
  /** Adapter registrations that share the stable id. */
  readonly entries: readonly QuireSelectionAdapterEntry<Adapter>[];
}

/** Equal-priority node ownership discovered during registry compilation. */
export interface QuireAmbiguousNodeSelectionAdapterGap<Adapter = unknown> {
  /** Machine-readable gap code. */
  readonly code: "ambiguous-node-selection-adapter";
  /** Node type claimed at the same priority by multiple adapters. */
  readonly nodeType: string;
  /** Priority at which ownership is ambiguous. */
  readonly priority: number;
  /** Adapter registrations that share the node type and priority. */
  readonly entries: readonly QuireSelectionAdapterEntry<Adapter>[];
}

/** Structural gap that prevents deterministic adapter lookup. */
export type QuireSelectionAdapterRegistrationGap<Adapter = unknown> =
  | QuireDuplicateSelectionAdapterIdGap<Adapter>
  | QuireAmbiguousNodeSelectionAdapterGap<Adapter>;

/** Deterministic lookup table for valid selection adapter registrations. */
export interface QuireSelectionAdapterRegistry<Adapter = unknown> {
  /** All adapters ordered by priority and stable declaration order. */
  readonly entries: readonly QuireSelectionAdapterEntry<Adapter>[];
  /**
   * Looks up an adapter by its stable id.
   *
   * @param id - Stable adapter identifier.
   * @returns Matching adapter entry, or undefined when no adapter is installed.
   */
  readonly getById: (
    id: string
  ) => QuireSelectionAdapterEntry<Adapter> | undefined;
  /**
   * Resolves the highest-priority adapter for a node type.
   *
   * @param nodeType - ProseMirror node type name.
   * @returns Winning adapter entry, or undefined when the node has no adapter.
   */
  readonly getByNodeType: (
    nodeType: string
  ) => QuireSelectionAdapterEntry<Adapter> | undefined;
  /**
   * Returns every adapter candidate for a node type in precedence order.
   *
   * @param nodeType - ProseMirror node type name.
   * @returns Adapter candidates from highest to lowest priority.
   */
  readonly getCandidatesByNodeType: (
    nodeType: string
  ) => readonly QuireSelectionAdapterEntry<Adapter>[];
}

/** Result of validating and compiling a selection adapter registry. */
export type QuireSelectionAdapterRegistryResult<Adapter = unknown> =
  | {
      /** Indicates that deterministic adapter lookup is available. */
      readonly valid: true;
      /** Validated selection adapter registry. */
      readonly registry: QuireSelectionAdapterRegistry<Adapter>;
    }
  | {
      /** Indicates that adapter lookup must not be used. */
      readonly valid: false;
      /** Structural gaps that made adapter lookup ambiguous. */
      readonly gaps: readonly QuireSelectionAdapterRegistrationGap<Adapter>[];
    };
