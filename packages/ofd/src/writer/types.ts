import type {
  OFDAttachment,
  OFDColorSpace,
  OFDDrawParam,
  OFDFont,
  OFDImage
} from "../resources";
import type {
  OFDDocumentSnapshot,
  OFDCompositeGraphicUnitSnapshot,
  OFDLayerSnapshot,
  OFDPageBlockSnapshot,
  OFDPageSnapshot,
  OFDTemplatePageSnapshot
} from "../document/state";
import type { OFDAnnotationSnapshot } from "../annotation/state";
import type { OFDGraphicObjectState } from "../model/types";
import type { OFDPageImage } from "../document/page-resources";

/** Assigned font resource. */
export interface OFDAssignedFont {
  /** Source font. */
  readonly source: OFDFont;
  /** Numeric OFD resource ID. */
  readonly id: string;
  /** Resource-relative font path. */
  readonly relativePath?: string;
  /** Complete package path. */
  readonly packagePath?: string;
}

/** Assigned image resource. */
export interface OFDAssignedImage {
  /** Source image. */
  readonly source: OFDImage;
  /** Numeric OFD resource ID. */
  readonly id: string;
  /** Resource-relative image path. */
  readonly relativePath: string;
  /** Complete package path. */
  readonly packagePath: string;
}

/** Assigned image resource local to one physical page. */
export interface OFDAssignedPageImage {
  /** Source page-local image handle. */
  readonly source: OFDPageImage;
  /** Document-wide numeric OFD resource ID. */
  readonly id: string;
  /** Resource-relative image path from the page resource file. */
  readonly relativePath: string;
  /** Complete package path. */
  readonly packagePath: string;
}

/** Assigned reusable device color-space resource. */
export interface OFDAssignedColorSpace {
  /** Source color-space handle. */
  readonly source: OFDColorSpace;
  /** Numeric resource ID. */
  readonly id: string;
}

/** Assigned reusable drawing-parameter resource. */
export interface OFDAssignedDrawParam {
  /** Source drawing-parameter handle. */
  readonly source: OFDDrawParam;
  /** Numeric resource ID. */
  readonly id: string;
}

/** Assigned reusable composite graphic unit and all of its nested IDs. */
export interface OFDAssignedCompositeGraphicUnit {
  /** Frozen composite source and layered content. */
  readonly source: OFDCompositeGraphicUnitSnapshot;
  /** Numeric composite resource ID. */
  readonly id: string;
  /** Numeric Content ID nested under the resource. */
  readonly contentId: string;
  /** Ordered assigned composite-content layers. */
  readonly layers: readonly OFDAssignedLayer[];
}

/** Assigned attachment resource. */
export interface OFDAssignedAttachment {
  /** Source attachment. */
  readonly source: OFDAttachment;
  /** XML attachment identifier. */
  readonly id: string;
  /** Document-relative file path. */
  readonly relativePath: string;
  /** Complete package path. */
  readonly packagePath: string;
}

/** Assigned graphic object. */
export interface OFDAssignedGraphic {
  /** Source graphic object. */
  readonly source: OFDGraphicObjectState;
  /** Numeric object ID. */
  readonly id: string;
}

/** One assigned child in a recursively nested page block. */
export type OFDAssignedPageBlockChild =
  | OFDAssignedGraphic
  | OFDAssignedPageBlock;

/** Assigned recursive page block without its own numeric OFD object ID. */
export interface OFDAssignedPageBlock {
  /** Source page-block snapshot. */
  readonly source: OFDPageBlockSnapshot;
  /** Optional OFD object ID emitted for native-reader interoperability. */
  readonly id: string;
  /** Ordered assigned graphic and nested block children. */
  readonly children: readonly OFDAssignedPageBlockChild[];
}

/** Assigned page layer. */
export interface OFDAssignedLayer {
  /** Source layer. */
  readonly source: OFDLayerSnapshot;
  /** Numeric layer ID. */
  readonly id: string;
  /** Ordered assigned graphic objects and page blocks. */
  readonly objects: readonly OFDAssignedPageBlockChild[];
}

/** Assigned page-local annotation and its appearance descendants. */
export interface OFDAssignedAnnotation {
  /** Source annotation snapshot. */
  readonly source: OFDAnnotationSnapshot;
  /** Numeric annotation ID in the document-wide ID domain. */
  readonly id: string;
  /** Assigned graphics and nested page blocks in the static appearance. */
  readonly appearance: readonly OFDAssignedPageBlockChild[];
}

/** Assigned physical page. */
export interface OFDAssignedPage {
  /** Source page. */
  readonly source: OFDPageSnapshot;
  /** Numeric page ID. */
  readonly id: string;
  /** Ordered assigned layers. */
  readonly layers: readonly OFDAssignedLayer[];
  /** Ordered page-local annotations. */
  readonly annotations: readonly OFDAssignedAnnotation[];
  /** Ordered page-local image resources. */
  readonly pageImages: readonly OFDAssignedPageImage[];
  /** Page-relative `PageRes.xml` location when local resources exist. */
  readonly pageResourceDocumentLocation?: string;
  /** Complete `PageRes.xml` package path when local resources exist. */
  readonly pageResourcePackagePath?: string;
  /** Document-relative annotation file when annotations exist. */
  readonly annotationDocumentLocation?: string;
  /** Complete annotation package path when annotations exist. */
  readonly annotationPackagePath?: string;
  /** Document-relative content location. */
  readonly documentLocation: string;
  /** Complete package path. */
  readonly packagePath: string;
}

/** Assigned reusable template page declared by document common data. */
export interface OFDAssignedTemplatePage {
  /** Source template-page snapshot. */
  readonly source: OFDTemplatePageSnapshot;
  /** Numeric template ID shared with page `TemplateID` references. */
  readonly id: string;
  /** Ordered assigned layers. */
  readonly layers: readonly OFDAssignedLayer[];
  /** Document-relative template content location. */
  readonly documentLocation: string;
  /** Complete template package path. */
  readonly packagePath: string;
}

/** Fully assigned standalone document. */
export interface OFDAssignedDocument {
  /** Source snapshot. */
  readonly source: OFDDocumentSnapshot;
  /** Assigned fonts. */
  readonly fonts: readonly OFDAssignedFont[];
  /** Assigned images. */
  readonly images: readonly OFDAssignedImage[];
  /** Page-local images flattened in page and registration order. */
  readonly pageImages: readonly OFDAssignedPageImage[];
  /** Assigned reusable device color spaces. */
  readonly colorSpaces: readonly OFDAssignedColorSpace[];
  /** Assigned reusable drawing parameters. */
  readonly drawParams: readonly OFDAssignedDrawParam[];
  /** Assigned reusable composite graphic resources. */
  readonly compositeGraphicUnits: readonly OFDAssignedCompositeGraphicUnit[];
  /** Assigned attachments. */
  readonly attachments: readonly OFDAssignedAttachment[];
  /** Assigned pages. */
  readonly pages: readonly OFDAssignedPage[];
  /** Assigned reusable template pages. */
  readonly templates: readonly OFDAssignedTemplatePage[];
  /** Greatest numeric ID. */
  readonly maximumId: string;
}
