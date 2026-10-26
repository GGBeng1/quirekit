import type {
  QuireLayoutCapabilityKind,
  QuireLayoutCoordinateSpaceKind,
  QuireLayoutExportFallbackKind,
  QuireLayoutRegionKind,
  QuireLayoutRootKind
} from "./types";

/** Consumer-neutral layout root kinds accepted by canonical snapshots. */
export const quireLayoutRootKinds = [
  "document",
  "body",
  "header",
  "footer",
  "footnote",
  "endnote",
  "table-cell",
  "drawing",
  "text-box",
  "drawing-text",
  "block-container",
  "media",
  "embed"
] as const satisfies readonly QuireLayoutRootKind[];

/** Consumer-neutral layout region kinds accepted by canonical snapshots. */
export const quireLayoutRegionKinds = [
  "body",
  "header",
  "footer",
  "footnote",
  "endnote",
  "section",
  "page-decoration",
  "watermark",
  "table-cell",
  "floating-object",
  "text-box",
  "drawing-text",
  "readonly-text",
  "node-body",
  "block-container",
  "media",
  "embed",
  "content-control",
  "interactive-widget",
  "control"
] as const satisfies readonly QuireLayoutRegionKind[];

/** Capability facts accepted by roots, regions, and exact layout products. */
export const quireLayoutCapabilityKinds = [
  "editable",
  "selectable",
  "focusable",
  "copyable",
  "commandable",
  "accessible"
] as const satisfies readonly QuireLayoutCapabilityKind[];

/** Export fallback kinds accepted by consumer-neutral layout products. */
export const quireLayoutExportFallbackKinds = [
  "native",
  "semantic-degraded",
  "visual-snapshot",
  "plain-text",
  "omitted-interaction"
] as const satisfies readonly QuireLayoutExportFallbackKind[];

/** Coordinate spaces that belong to layout rather than a mounted View surface. */
export const quireLayoutCoordinateSpaceKinds = [
  "document",
  "page",
  "body",
  "region-local",
  "table-cell-local",
  "shape-local",
  "text-box-local",
  "source-flow",
  "sub-layout-local"
] as const satisfies readonly QuireLayoutCoordinateSpaceKind[];
