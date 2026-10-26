import type { QuireLayoutDependency } from "../layout-dependency/types";
import type {
  QuireSelectionAdapter,
  QuireSelectionAdapterModes,
  QuireSelectionContribution,
  QuireSelectionPresetFactory,
  QuireSelectionPresetOptions,
  QuireSemanticUnitsSelectionPresetOptions
} from "./types";

const documentDependency: QuireLayoutDependency = Object.freeze({ kind: "document" });

const DELEGATE_MODES: QuireSelectionAdapterModes = {
  internal: "delegate",
  entry: "delegate",
  exit: "delegate",
  fullyCrossed: "delegate"
};

const OWNER_MODES: QuireSelectionAdapterModes = {
  internal: "owner",
  entry: "owner",
  exit: "owner",
  fullyCrossed: "owner"
};

const SEMANTIC_UNIT_MODES: QuireSelectionAdapterModes = {
  internal: "delegate",
  entry: "semantic-units",
  exit: "semantic-units",
  fullyCrossed: "owner"
};

const SKIP_MODES: QuireSelectionAdapterModes = {
  internal: "skip",
  entry: "skip",
  exit: "skip",
  fullyCrossed: "skip"
};

/**
 * Builds one typed contribution from preset metadata and compiled behavior.
 *
 * @param options - Stable registration metadata.
 * @param adapter - Renderer-neutral selection behavior.
 * @param defaultDependency - Proof for a compiler owned entirely by this preset.
 * @returns Core registration consumed by either selection contribution hook.
 */
function createPresetContribution(
  options: QuireSelectionPresetOptions,
  adapter: QuireSelectionAdapter,
  defaultDependency?: QuireLayoutDependency
): QuireSelectionContribution {
  return {
    id: options.id,
    nodeTypes: options.nodeTypes,
    ...(options.priority === undefined
      ? {}
      : { priority: options.priority }),
    adapter,
    ...((options.layoutDependency ?? defaultDependency) === undefined
      ? {}
      : { layoutDependency: options.layoutDependency ?? defaultDependency })
  };
}

/**
 * Creates the shared adapter fields owned by every selection preset.
 *
 * @param options - Stable preset metadata.
 * @param modes - Safe crossing decisions owned by the preset.
 * @returns Shared adapter fields without the semantic-unit compiler.
 */
function createPresetAdapterBase(
  options: QuireSelectionPresetOptions,
  modes: QuireSelectionAdapterModes
): Omit<QuireSelectionAdapter, "compileUnits"> {
  return {
    version: 1,
    id: options.id,
    nodeTypes: options.nodeTypes,
    modes,
    commandDomain: options.commandDomain ?? options.id,
    clipboardDomain: options.clipboardDomain ?? options.id,
    mappingFallback: "text",
    replacementFallback: "text"
  };
}

/** High-level selection presets consumed by ordinary extensions. */
export const selectionPreset: QuireSelectionPresetFactory = {
  /**
   * Keeps an inline owner in ordinary text semantics.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  inline(options) {
    return createPresetContribution(options, {
      ...createPresetAdapterBase(options, DELEGATE_MODES),
      compileUnits: () => []
    }, documentDependency);
  },
  /**
   * Keeps partial content editable while giving complete crossings a single owner.
   * @param options - Stable container metadata.
   * @returns One typed selection contribution without indivisible child units.
   */
  container(options) {
    return createPresetContribution(options, {
      ...createPresetAdapterBase(options, { ...DELEGATE_MODES, fullyCrossed: "owner" }),
      compileUnits: () => []
    }, documentDependency);
  },
  /**
   * Selects an atomic block as one indivisible owner.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  atomicBlock(options) {
    return createPresetContribution(options, {
      ...createPresetAdapterBase(options, OWNER_MODES),
      mappingFallback: "nearest",
      replacementFallback: "owner",
      compileUnits: ({ node }) => [{
        id: "owner",
        kind: "owner",
        range: { from: 0, to: node.nodeSize }
      }]
    }, documentDependency);
  },
  /**
   * Promotes boundary crossings to ordered semantic units.
   *
   * @param options - Owner metadata and semantic-unit compiler.
   * @returns One typed selection contribution.
   */
  semanticUnits(options) {
    return createPresetContribution(options, {
      ...createPresetAdapterBase(options, SEMANTIC_UNIT_MODES),
      mappingFallback: options.mappingFallback ?? "text",
      replacementFallback: options.replacementFallback ?? "reject",
      compileUnits: options.compileUnits
    });
  },
  /**
   * Excludes an owner from dragged range selection.
   *
   * @param options - Stable owner metadata.
   * @returns One typed selection contribution.
   */
  skip(options) {
    return createPresetContribution(options, {
      ...createPresetAdapterBase(options, SKIP_MODES),
      mappingFallback: "remove",
      replacementFallback: "reject",
      compileUnits: () => []
    }, documentDependency);
  }
};
