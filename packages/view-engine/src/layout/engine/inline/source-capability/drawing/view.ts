import { formatQuireMediaResourceKey } from "@quirekit/media";
import { qkView } from "@quirekit/renderer";
import type { QuireDrawingObject } from "../../../../../document-profile/types";
import { createQuireWordShapePaintCommands } from "../../../../../drawing/geometry";
import { createEmbeddedDrawingView } from "./embedded-view";
import { createWordDrawingBoxStyle } from "./appearance";
import { createQuireWordPictureImageTransform } from "./picture-transform";

/**
 * Creates the retained drawing view for a shape, text box, or picture.
 *
 * Picture nodes emit portable identity and crop intent only. Mounted View owns
 * resource resolution and browser-local paint inputs.
 *
 * @param attrs - Canonical drawing object.
 * @returns Renderer-neutral retained drawing view.
 */
export function createWordDrawingView(
  attrs: QuireDrawingObject
): ReturnType<typeof qkView.surface> {
  if (attrs.drawing.kind === "embedded") return createEmbeddedDrawingView(attrs);
  const picture = attrs.drawing.picture;
  const pictureTransform = createQuireWordPictureImageTransform(
    attrs.drawing.transform
  );
  return qkView.surface({
    id: `word-floating-object:${attrs.objectId}`,
    width: attrs.drawing.extent.width,
    height: attrs.drawing.extent.height,
    ...(picture === null ? {} : { style: createWordDrawingBoxStyle(attrs.drawing.appearance) }),
    ...(attrs.drawing.kind !== "picture" || picture === null
      ? { child: qkView.customPaint({
          id: `word-floating-object:${attrs.objectId}:geometry`,
          width: attrs.drawing.extent.width,
          height: attrs.drawing.extent.height,
          paint: (rect, id) => createQuireWordShapePaintCommands(attrs.drawing, rect, id)
        }) }
      : {
          child: qkView.customPaint({
            width: attrs.drawing.extent.width,
            height: attrs.drawing.extent.height,
            paint: (rect, id) => [{
              id,
              kind: "image",
              rect,
              resourceKey: formatQuireMediaResourceKey(picture.source),
              sourceCrop: picture.crop,
              ...(picture.colorAdjustment === undefined ? {} : { colorAdjustment: picture.colorAdjustment }),
              ...(picture.opacity === undefined ? {} : { opacity: picture.opacity }),
              ...(pictureTransform === undefined
                ? {}
                : { transform: pictureTransform }),
              ...(picture.intrinsicSize === null
                ? {}
                : { sourceSize: picture.intrinsicSize })
            }]
          })
        })
  });
}
