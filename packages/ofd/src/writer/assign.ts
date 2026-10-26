import { OFDIdAllocator } from "../id";
import type { OFDDocumentSnapshot } from "../document/state";
import type {
  OFDAssignedAttachment,
  OFDAssignedAnnotation,
  OFDAssignedColorSpace,
  OFDAssignedCompositeGraphicUnit,
  OFDAssignedDocument,
  OFDAssignedDrawParam,
  OFDAssignedFont,
  OFDAssignedGraphic,
  OFDAssignedImage,
  OFDAssignedLayer,
  OFDAssignedPage,
  OFDAssignedPageImage,
  OFDAssignedPageBlock,
  OFDAssignedPageBlockChild,
  OFDAssignedTemplatePage
} from "./types";
import type {
  OFDLayerSnapshot,
  OFDPageBlockChildSnapshot
} from "../document/state";
import type { OFDAnnotationSnapshot } from "../annotation/state";

/**
 * Assigns deterministic numeric IDs and package paths.
 *
 * @param source - Frozen document snapshot.
 * @returns Fully assigned document.
 */
export function assignOFDDocument(
  source: OFDDocumentSnapshot
): OFDAssignedDocument {
  const ids = new OFDIdAllocator();
  const fonts: OFDAssignedFont[] = source.fonts.map((font, index) => {
    const extension = font.format === "OpenType" ? "otf" : "ttf";
    const relativePath = font.data ? `Fonts/font-${index}.${extension}` : undefined;
    return {
      source: font,
      id: ids.allocate(),
      ...(relativePath
        ? {
            relativePath,
            packagePath: `Doc_0/Res/${relativePath}`
          }
        : {})
    };
  });
  const images: OFDAssignedImage[] = source.images.map((image, index) => {
    const extension = image.format === "PNG" ? "png" : "jpg";
    const relativePath = `Images/image-${index}.${extension}`;
    return {
      source: image,
      id: ids.allocate(),
      relativePath,
      packagePath: `Doc_0/Res/${relativePath}`
    };
  });
  const colorSpaces: OFDAssignedColorSpace[] = source.colorSpaces.map((source) => ({
    source,
    id: ids.allocate()
  }));
  const drawParams: OFDAssignedDrawParam[] = source.drawParams.map((source) => ({
    source,
    id: ids.allocate()
  }));
  const compositeGraphicUnits: OFDAssignedCompositeGraphicUnit[] = source.compositeGraphicUnits
    .map((source) => ({
      source,
      id: ids.allocate(),
      contentId: ids.allocate(),
      layers: assignOFDLayers(source.layers, ids)
    }));
  // Allocate reusable templates before ordinary pages so every TemplateID is
  // stable in the document-wide ID domain before page references are emitted.
  const templates: OFDAssignedTemplatePage[] = source.templates.map((template) => ({
    source: template,
    id: ids.allocate(),
    documentLocation: `Tpls/Template_${template.templateIndex}/Content.xml`,
    packagePath: `Doc_0/Tpls/Template_${template.templateIndex}/Content.xml`,
    layers: assignOFDLayers(template.layers, ids)
  }));
  const pageImages: OFDAssignedPageImage[] = [];
  const pages: OFDAssignedPage[] = source.pages.map((page) => {
    const pageId = ids.allocate();
    const annotations = assignOFDAnnotations(page.annotations, ids);
    const localImages = page.pageImages.map((image, index) => {
      const extension = image.format === "PNG" ? "png" : "jpg";
      const relativePath = `Images/page-image-${index}.${extension}`;
      const assigned = {
        source: image,
        id: ids.allocate(),
        relativePath,
        packagePath: `Doc_0/Pages/Page_${page.pageIndex}/Res/${relativePath}`
      } satisfies OFDAssignedPageImage;
      pageImages.push(assigned);
      return assigned;
    });
    return {
      source: page,
      id: pageId,
      documentLocation: `Pages/Page_${page.pageIndex}/Content.xml`,
      packagePath: `Doc_0/Pages/Page_${page.pageIndex}/Content.xml`,
      layers: assignOFDLayers(page.layers, ids),
      annotations,
      pageImages: localImages,
      ...(localImages.length > 0
        ? {
            pageResourceDocumentLocation: "PageRes.xml",
            pageResourcePackagePath: `Doc_0/Pages/Page_${page.pageIndex}/PageRes.xml`
          }
        : {}),
      ...(annotations.length > 0
        ? {
            annotationDocumentLocation: `Annots/Page_${page.pageIndex}.xml`,
            annotationPackagePath: `Doc_0/Annots/Page_${page.pageIndex}.xml`
          }
        : {})
    };
  });
  const attachments: OFDAssignedAttachment[] = source.attachments
    .map((attachment, index) => {
      const safeName = safeAttachmentName(attachment.options.name, index);
      const relativePath = `Attachments/${safeName}`;
      return {
        source: attachment,
        id: ids.allocate(),
        relativePath,
        packagePath: `Doc_0/${relativePath}`
      };
    });
  return {
    source,
    fonts,
    images,
    pageImages,
    colorSpaces,
    drawParams,
    compositeGraphicUnits,
    templates,
    pages,
    attachments,
    maximumId: ids.maximum()
  };
}

/**
 * Assigns annotation IDs and every static-appearance graphic in paint order.
 *
 * @param annotations - Immutable page-local annotation snapshots.
 * @param ids - Shared document-wide identifier allocator.
 * @returns Assigned annotations.
 */
function assignOFDAnnotations(
  annotations: readonly OFDAnnotationSnapshot[],
  ids: OFDIdAllocator
): readonly OFDAssignedAnnotation[] {
  return annotations.map((source) => ({
    source,
    id: ids.allocate(),
    appearance: source.appearance.children.map((child) =>
      assignOFDPageBlockChild(child, ids)
    )
  }));
}

/**
 * Assigns document-wide IDs to one ordered layer sequence.
 *
 * @param layers - Immutable layer snapshots.
 * @param ids - Shared document-wide identifier allocator.
 * @returns Assigned layers and descendants.
 */
function assignOFDLayers(
  layers: readonly OFDLayerSnapshot[],
  ids: OFDIdAllocator
): readonly OFDAssignedLayer[] {
  return layers.map((layer) => ({
    source: layer,
    id: ids.allocate(),
    objects: layer.objects.map((object) => assignOFDPageBlockChild(object, ids))
  }));
}

/**
 * Assigns one page-block child while retaining recursive tree order.
 *
 * @param child - Graphic or nested page block to assign.
 * @param ids - Shared document-wide identifier allocator.
 * @returns Assigned graphic or nested page block.
 */
function assignOFDPageBlockChild(
  child: OFDPageBlockChildSnapshot,
  ids: OFDIdAllocator
): OFDAssignedPageBlockChild {
  if (child.type === "page-block") return assignOFDPageBlock(child, ids);
  return assignOFDGraphic(child, ids);
}

/**
 * Assigns one recursively nested page block.
 *
 * @param source - Source page-block snapshot.
 * @param ids - Shared document-wide identifier allocator.
 * @returns Assigned page block and descendants.
 */
function assignOFDPageBlock(
  source: Extract<OFDPageBlockChildSnapshot, { type: "page-block" }>,
  ids: OFDIdAllocator
): OFDAssignedPageBlock {
  return {
    source,
    id: ids.allocate(),
    children: source.children.map((child) => assignOFDPageBlockChild(child, ids))
  };
}

/**
 * Assigns one ordinary graphic object.
 *
 * @param source - Source graphic state.
 * @param ids - Shared document-wide identifier allocator.
 * @returns Assigned graphic object.
 */
function assignOFDGraphic(
  source: Exclude<OFDPageBlockChildSnapshot, { type: "page-block" }>,
  ids: OFDIdAllocator
): OFDAssignedGraphic {
  return { source, id: ids.allocate() };
}

/**
 * Creates a safe, deterministic attachment file name.
 *
 * @param name - User-visible attachment name.
 * @param index - Stable attachment index.
 * @returns Safe package file name.
 */
function safeAttachmentName(name: string, index: number): string {
  const normalized = name
    .normalize("NFC")
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .replaceAll("\0", "_")
    .trim();
  return normalized.length > 0 ? `${index}-${normalized}` : `${index}-attachment.bin`;
}
