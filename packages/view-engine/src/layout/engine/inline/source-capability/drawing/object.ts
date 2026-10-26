import { resolveQuireDrawingControlOverflow } from "../../../../../drawing/control-points/overflow";
import { resolveQuireDrawingLineHitAreas } from "../../../../../drawing/hit-targets";
import { resolveQuireWordShapeTextInsets, resolveQuireWordShapeVisualOverflow } from "../../../../../drawing/geometry";
import type { QuireDrawingModelProfile, QuireDrawingObject } from "../../../../../document-profile/types";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireDrawingObjectSourceCapabilityResolverOptions } from "./types";
import { createEmbeddedDrawingSelectedView } from "./embedded-view";
import { createWordDrawingView } from "./view";
import {
  createQuireDrawingSelectedObjectView,
  quireDrawingSelectionHandleHitRadius
} from "../../../../../interaction/drawing-controller/products";
import type {
  QuireInlineSourceCapabilityResolver,
  QuireInlineSourcePresentation
} from "../types";
import {
  createWordDrawingPresentationSignature
} from "./signature";
import {
  createQuireWordPictureImageTransform,
  resolveQuireWordPictureVisualOverflow
} from "./picture-transform";

/**
 * Creates the source-capability resolver for a drawing model's anchor nodes.
 *
 * The drawing model maps its attrs onto a canonical object and placement;
 * this resolver compiles the retained drawing presentation.
 *
 * @param anchorNodeType - Node type anchoring drawing objects.
 * @param drawingModel - Drawing model reading anchor attrs.
 * @param options - Snapshot-local related story ranges.
 * @returns Internal exact-node-type resolver.
 */
export function createQuireDrawingObjectSourceCapabilityResolver(
  anchorNodeType: string,
  drawingModel: QuireDrawingModelProfile,
  options: QuireDrawingObjectSourceCapabilityResolverOptions = {}
): QuireInlineSourceCapabilityResolver {
  return {
    nodeType: anchorNodeType,
    resolve(input) {
      const object = drawingModel.readObject(input.attrs, options.document);
      if (object === undefined) {
        return {
          status: "gap",
          gaps: [{
            code: "invalid-source-declaration",
            nodeType: input.nodeType,
            message: "Drawing-object attrs are missing canonical source authority."
          }]
        };
      }

      return {
        status: "resolved",
        placement: object.placement,
        presentation: createViewPresentation(object, options.storyRangesById)
      };
    }
  };
}


/**
 * Compiles View-only presentation independently from layout placement.
 *
 * @param attrs - Canonical drawing object.
 * @param storyRangesById - Snapshot-local related story ranges.
 * @returns Retained View presentation consumed after geometry resolves.
 */
function createViewPresentation(
  attrs: QuireDrawingObject,
  storyRangesById: ReadonlyMap<string, QuireDocumentRange> | undefined
): QuireInlineSourcePresentation {
  const textBody = attrs.drawing.textBody;
  const textInsets = resolveQuireWordShapeTextInsets(attrs.drawing);
  const relatedRange = attrs.storyId === null
    ? undefined
    : storyRangesById?.get(attrs.storyId);
  const drawingTransform = createQuireWordPictureImageTransform(
    attrs.drawing.transform
  );
  const viewVisualOverflow = attrs.drawing.kind === "embedded" ? undefined : attrs.drawing.kind === "picture" ? resolveQuireWordPictureVisualOverflow(
    attrs.drawing.extent,
    drawingTransform
  ) : resolveQuireWordShapeVisualOverflow(attrs.drawing);
  const interactionTransform = attrs.drawing.transform.rotation % 360 !== 0
    ? { rotation: attrs.drawing.transform.rotation }
    : undefined;
  const interactionHitAreas = resolveQuireDrawingLineHitAreas(attrs.drawing);
  return {
    view: createWordDrawingView(attrs),
    ...(viewVisualOverflow === undefined ? {} : { viewVisualOverflow }),
    presentationSignature: createWordDrawingPresentationSignature(attrs.drawing)
      + (attrs.embeddedPresentation === undefined ? "" : `\u0002${attrs.embeddedPresentation.signature}`),
    ...(interactionTransform === undefined ? {} : { interactionTransform }),
    ...(interactionHitAreas === undefined ? {} : { interactionHitAreas }),
    selectedView: () => attrs.drawing.kind === "embedded" ? createEmbeddedDrawingSelectedView(attrs) : createQuireDrawingSelectedObjectView(
      attrs.drawing.extent.width,
      attrs.drawing.extent.height,
      {
        objectId: attrs.objectId,
        drawingId: attrs.drawing.drawingId,
        drawing: attrs.drawing,
        lockAspectRatio: attrs.drawing.transform.lockAspectRatio,
        ...(attrs.storyId === null || textBody === null
          ? {}
          : {
              storyId: attrs.storyId,
              textInsetLeft: textInsets.left,
              textInsetTop: textInsets.top,
              textWidth: Math.max(1, attrs.drawing.extent.width
                - textInsets.left
                - textInsets.right),
              textHeight: Math.max(1, attrs.drawing.extent.height
                - textInsets.top
                - textInsets.bottom)
            })
      }
    ),
    selectedViewVisualOverflow: resolveQuireDrawingControlOverflow(
      viewVisualOverflow,
      attrs.drawing.kind === "embedded" && attrs.embeddedPresentation?.resizePolicy === undefined ? 1 : quireDrawingSelectionHandleHitRadius,
      interactionTransform?.rotation,
      attrs.drawing
    ),
    selectedViewActivation: {
      kind: "selected-owner",
      ...(relatedRange === undefined ? {} : { relatedRange })
    },
    rootKind: attrs.storyId === null ? "drawing" : "drawing-text",
    semanticRole: attrs.storyId === null ? "object" : "text-box",
    search: {
      kind: "excluded",
      reason: attrs.storyId === null
        ? "The anchored object shell does not own searchable text."
        : "The independently editable story owns searchable text."
    },
    exportFallbacks: [{
      kind: "native",
      targetFormat: "docx",
      sourceMetadata: { objectId: attrs.objectId }
    }, {
      kind: "semantic-degraded",
      targetFormat: "html",
      reason: "Continuous-flow HTML preserves source order instead of paginated placement.",
      sourceMetadata: { objectId: attrs.objectId }
    }]
  };
}
