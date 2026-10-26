import type {
  OFDBookmarkOptions,
  OFDDocumentMetadata,
  OFDOutlineOptions,
  OFDPageOptions,
  OFDPermissions,
  OFDProfile,
  OFDTemplatePageOptions,
  OFDTemplateReferenceOptions,
  OFDViewerPreferences
} from "./types";
import type {
  OFDAttachment,
  OFDCompositeGraphicUnit,
  OFDColorSpace,
  OFDDrawParam,
  OFDFont,
  OFDImage
} from "../resources";
import type { OFDCompositeGraphicUnitOptions } from "../resources";
import type {
  OFDGraphicObjectState,
  OFDLayerOptions
} from "../model/types";
import type { OFDAnnotationSnapshot } from "../annotation/state";
import type { OFDAction, OFDDocumentOpenAction } from "../action";
import type { OFDPageImage } from "./page-resources";

/** One recursively nestable child stored by a layer or page block. */
export type OFDPageBlockChildSnapshot =
  | OFDGraphicObjectState
  | OFDPageBlockSnapshot;

/** Immutable recursive page block used to group ordered graphic children. */
export interface OFDPageBlockSnapshot {
  /** Stable discriminator for recursive writer traversal. */
  readonly type: "page-block";
  /** Ordered graphic objects and nested page blocks. */
  readonly children: readonly OFDPageBlockChildSnapshot[];
}

/** Internal immutable layer snapshot. */
export interface OFDLayerSnapshot {
  /** Frozen layer options. */
  readonly options: Readonly<OFDLayerOptions>;
  /** Ordered graphic objects and nested page blocks. */
  readonly objects: readonly OFDPageBlockChildSnapshot[];
}

/** One template reference owned by an ordinary page snapshot. */
export interface OFDTemplateReferenceSnapshot {
  /** Identity of the referenced template page. */
  readonly templateIdentity: object;
  /** Identity of the document that owns the template page. */
  readonly documentIdentity: object;
  /** Optional per-page presentation-order override. */
  readonly options: Readonly<OFDTemplateReferenceOptions>;
}

/** Internal immutable page snapshot. */
export interface OFDPageSnapshot {
  /** Stable zero-based page index. */
  readonly pageIndex: number;
  /** Public page identity used by destinations. */
  readonly pageIdentity: object;
  /** Frozen page options. */
  readonly options: Readonly<OFDPageOptions>;
  /** Ordered layers. */
  readonly layers: readonly OFDLayerSnapshot[];
  /** Ordered reusable template references painted before page content. */
  readonly templates: readonly OFDTemplateReferenceSnapshot[];
  /** Ordered page-local annotations. */
  readonly annotations: readonly OFDAnnotationSnapshot[];
  /** Ordered actions executed when the page opens. */
  readonly actions: readonly OFDAction[];
  /** Ordered image resources local to this physical page. */
  readonly pageImages: readonly OFDPageImage[];
}

/** Internal immutable reusable template-page snapshot. */
export interface OFDTemplatePageSnapshot {
  /** Stable zero-based template index. */
  readonly templateIndex: number;
  /** Public template identity used by page references. */
  readonly templateIdentity: object;
  /** Frozen template dimensions and presentation defaults. */
  readonly options: Readonly<OFDTemplatePageOptions>;
  /** Ordered template-content layers. */
  readonly layers: readonly OFDLayerSnapshot[];
}

/** Immutable reusable composite graphic resource and its nested content. */
export interface OFDCompositeGraphicUnitSnapshot {
  /** Public handle used by CompositeObject references. */
  readonly source: OFDCompositeGraphicUnit;
  /** Frozen dimensions and optional thumbnail. */
  readonly options: Readonly<OFDCompositeGraphicUnitOptions>;
  /** Ordered composite-content layers. */
  readonly layers: readonly OFDLayerSnapshot[];
}

/** Internal immutable document snapshot. */
export interface OFDDocumentSnapshot {
  /** Private ownership identity. */
  readonly documentIdentity: object;
  /** Target standard profile. */
  readonly profile: OFDProfile;
  /** Frozen metadata. */
  readonly metadata: Readonly<OFDDocumentMetadata>;
  /** Ordered font resources. */
  readonly fonts: readonly OFDFont[];
  /** Ordered image resources. */
  readonly images: readonly OFDImage[];
  /** Ordered reusable device color spaces. */
  readonly colorSpaces: readonly OFDColorSpace[];
  /** Ordered reusable drawing parameters. */
  readonly drawParams: readonly OFDDrawParam[];
  /** Ordered reusable composite graphic resources. */
  readonly compositeGraphicUnits: readonly OFDCompositeGraphicUnitSnapshot[];
  /** Ordered attachments. */
  readonly attachments: readonly OFDAttachment[];
  /** Ordered pages. */
  readonly pages: readonly OFDPageSnapshot[];
  /** Ordered reusable template pages. */
  readonly templates: readonly OFDTemplatePageSnapshot[];
  /** Ordered bookmarks. */
  readonly bookmarks: readonly Readonly<OFDBookmarkOptions>[];
  /** Ordered outline roots. */
  readonly outlines: readonly Readonly<OFDOutlineOptions>[];
  /** Ordered actions executed when the document opens. */
  readonly documentOpenActions: readonly OFDDocumentOpenAction[];
  /** Optional permissions. */
  readonly permissions?: Readonly<OFDPermissions>;
  /** Optional viewer preferences. */
  readonly viewerPreferences?: Readonly<OFDViewerPreferences>;
  /** Ordered custom metadata values. */
  readonly customData: readonly Readonly<{ name: string; value: string }>[];
}
