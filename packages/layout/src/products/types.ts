import type {
  QuireLayoutCapabilitySet,
  QuireLayoutCoordinatePath,
  QuireLayoutCoordinateSpaceKind,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSourceRef
} from "../identity";

/** Exact owner facts projected onto one layout or query product. */
export interface QuireLayoutOwnerFacts {
  /** Region that owns the exact product. */
  readonly region: QuireLayoutRegionRef;
  /** Region-owned source identity, which may differ from the root source. */
  readonly source: QuireLayoutSourceRef;
  /** Region-owned capabilities active for the exact product. */
  readonly capabilities: QuireLayoutCapabilitySet;
}

/** Ownership and coordinate provenance shared by layout query products. */
export interface QuireLayoutQueryProductOwner {
  /** Stable layout or sub-layout root id that produced the query product. */
  readonly sourceRootId: string;
  /** Stable visual fragment id that produced this product, when fragmented. */
  readonly sourceFragmentId?: string | undefined;
  /** Coordinate space of the exposed product rectangle. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
  /** Coordinate space from which the product was projected. */
  readonly sourceCoordinateSpace?: QuireLayoutCoordinateSpaceKind | undefined;
  /** Explicit conversion path from source to exposed coordinates. */
  readonly coordinatePath?: QuireLayoutCoordinatePath | undefined;
  /** Exact layout root represented by the product, when available. */
  readonly root?: QuireLayoutRoot | undefined;
  /** Exact layout region represented by the product, when available. */
  readonly region?: QuireLayoutRegionRef | undefined;
}
