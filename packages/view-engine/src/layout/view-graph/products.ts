import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionKind,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutRootId,
  QuireLayoutRootKind
} from "@quirekit/layout/identity";

/** Options used to create a default retained view root. */
export interface CreateQuireDefaultViewRootOptions {
  /** Stable retained root id. */
  readonly rootId: string;
  /** Retained root kind. */
  readonly kind: QuireLayoutRootKind;
  /** Source id exposed to diagnostics. */
  readonly sourceId: string;
  /** Source document range represented by the root. */
  readonly range: QuireDocumentRange;
  /** Optional capability overrides for the root. */
  readonly capabilities?: Partial<QuireLayoutCapabilitySet> | undefined;
}

/** Options used to create a default retained view region. */
export interface CreateQuireDefaultViewRegionOptions {
  /** Root id that owns the region. */
  readonly rootId: QuireLayoutRootId;
  /** Stable retained region id. */
  readonly regionId: string;
  /** Retained region kind. */
  readonly kind: QuireLayoutRegionKind;
  /** Optional parent region address. */
  readonly parentRegion?: QuireLayoutRegionRef["parentRegion"] | undefined;
}

/** Body view-graph products attached to the top-level layout document. */
export interface QuireBodyViewGraphProducts {
  /** Retained body root. */
  readonly viewRoot: QuireLayoutRoot;
  /** Retained body region. */
  readonly viewRegion: QuireLayoutRegionRef;
  /** Capability declarations for the body. */
  readonly viewCapabilities: QuireLayoutCapabilitySet;
}

/**
 * Creates the default retained capability set.
 *
 * @param overrides - Optional capability overrides.
 * @returns Complete capability set.
 */
export function createQuireDefaultViewCapabilities(
  overrides: Partial<QuireLayoutCapabilitySet> = {}
): QuireLayoutCapabilitySet {
  return {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true,
    ...overrides
  };
}

/**
 * Creates the default retained body root and region products.
 *
 * @param range - Source document range represented by the body.
 * @returns Body root, body region, and capabilities.
 */
export function createQuireBodyViewGraphProducts(
  range: QuireDocumentRange
): QuireBodyViewGraphProducts {
  const viewCapabilities = createQuireDefaultViewCapabilities();
  const viewRoot = createQuireDefaultViewRoot({
    rootId: "root:body",
    kind: "body",
    sourceId: "doc:body",
    range,
    capabilities: viewCapabilities
  });
  const viewRegion = createQuireDefaultViewRegion({
    rootId: viewRoot.id,
    regionId: "region:body",
    kind: "body"
  });

  return {
    viewRoot,
    viewRegion,
    viewCapabilities
  };
}

/**
 * Creates a default retained view root.
 *
 * @param options - Root identity, kind, source, and capability inputs.
 * @returns Retained view root.
 */
export function createQuireDefaultViewRoot(
  options: CreateQuireDefaultViewRootOptions
): QuireLayoutRoot {
  return {
    id: { value: options.rootId },
    kind: options.kind,
    source: {
      sourceId: options.sourceId,
      range: options.range
    },
    capabilities: createQuireDefaultViewCapabilities(options.capabilities)
  };
}

/**
 * Creates a default retained view region.
 *
 * @param options - Region identity and ownership inputs.
 * @returns Retained view region reference.
 */
export function createQuireDefaultViewRegion(
  options: CreateQuireDefaultViewRegionOptions
): QuireLayoutRegionRef {
  return {
    rootId: options.rootId,
    regionId: { value: options.regionId },
    kind: options.kind,
    ...(options.parentRegion === undefined
      ? {}
      : { parentRegion: options.parentRegion })
  };
}
