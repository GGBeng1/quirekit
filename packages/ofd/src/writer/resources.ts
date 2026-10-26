import {
  ofdXmlElement,
  renderOFDXmlDocument,
  type OFDXmlElement
} from "../xml";
import { normalizeOFDAttachmentDate } from "../model/date";
import type { OFDDrawParamColor } from "../resources";
import type { OFDAssignedDocument } from "./types";
import { formatOFDNumber } from "./format";
import { compileOFDPageBlockChild } from "./page-block";

/**
 * Compiles public fonts, color spaces, and drawing parameters.
 *
 * @param document - Assigned document.
 * @returns Complete `PublicRes.xml`.
 */
export function createOFDPublicResourcesXml(
  document: OFDAssignedDocument
): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:Res", {
    "xmlns:ofd": "http://www.ofdspec.org/2016",
    BaseLoc: "Res"
  }, [
    ...compileOFDColorSpaces(document),
    ...compileOFDDrawParams(document),
    ...(document.fonts.length > 0 ? [ofdXmlElement("ofd:Fonts", {}, document.fonts.map((font) =>
      ofdXmlElement("ofd:Font", {
        ID: font.id,
        FontName: font.source.options.fontName,
        FamilyName: font.source.options.familyName,
        Charset: font.source.options.charset,
        Bold: font.source.options.bold,
        Italic: font.source.options.italic,
        Serif: font.source.options.serif,
        FixedWidth: font.source.options.fixedWidth
      }, font.relativePath
        ? [ofdXmlElement("ofd:FontFile", {}, [font.relativePath])]
        : [])
    ))] : [])
  ]));
}

/**
 * Compiles registered color spaces in stable registration order.
 *
 * @param document - Assigned document resource graph.
 * @returns Empty or singleton ColorSpaces resource collection.
 */
function compileOFDColorSpaces(document: OFDAssignedDocument): OFDXmlElement[] {
  if (document.colorSpaces.length === 0) return [];
  return [ofdXmlElement("ofd:ColorSpaces", {}, document.colorSpaces.map((colorSpace) =>
    ofdXmlElement("ofd:ColorSpace", {
      ID: colorSpace.id,
      Type: colorSpaceTypeToXml(colorSpace.source.options.type),
      BitsPerComponent: colorSpace.source.options.bitsPerComponent
    }, colorSpace.source.options.palette
      ? [ofdXmlElement("ofd:Palette", {}, colorSpace.source.options.palette.map((color) =>
          ofdXmlElement("ofd:CV", {}, [color.map(formatOFDNumber).join(" ")])
        ))]
      : [])
  ))];
}

/**
 * Compiles registered reusable drawing parameters in stable registration order.
 *
 * @param document - Assigned document resource graph.
 * @returns Empty or singleton DrawParams resource collection.
 */
function compileOFDDrawParams(document: OFDAssignedDocument): OFDXmlElement[] {
  if (document.drawParams.length === 0) return [];
  return [ofdXmlElement("ofd:DrawParams", {}, document.drawParams.map((drawParam) => {
    const options = drawParam.source.options;
    const relative = options.relative
      ? document.drawParams.find((candidate) => candidate.source === options.relative)
      : undefined;
    if (options.relative && !relative) {
      throw new TypeError("DrawParam references an unknown OFD DrawParam.");
    }
    return ofdXmlElement("ofd:DrawParam", {
      ID: drawParam.id,
      Relative: relative?.id,
      LineWidth: options.lineWidth === undefined
        ? undefined
        : formatOFDNumber(options.lineWidth),
      Join: options.lineJoin,
      Cap: options.lineCap,
      DashOffset: options.dashOffset === undefined
        ? undefined
        : formatOFDNumber(options.dashOffset),
      DashPattern: options.dashPattern?.map(formatOFDNumber).join(" "),
      MiterLimit: options.miterLimit === undefined
        ? undefined
        : formatOFDNumber(options.miterLimit)
    }, [
      ...compileOFDDrawParamPaint("ofd:FillColor", options.fillColor, document),
      ...compileOFDDrawParamPaint("ofd:StrokeColor", options.strokeColor, document)
    ]);
  }))];
}

/**
 * Compiles a reusable fill or stroke color with its optional color-space ID.
 *
 * @param name - Qualified fill or stroke element name.
 * @param color - Optional typed color value.
 * @param document - Assigned document resource graph.
 * @returns Empty or singleton color child collection.
 */
function compileOFDDrawParamPaint(
  name: "ofd:FillColor" | "ofd:StrokeColor",
  color: OFDDrawParamColor | undefined,
  document: OFDAssignedDocument
): OFDXmlElement[] {
  if (!color) return [];
  const colorSpace = color.colorSpace
    ? document.colorSpaces.find((candidate) => candidate.source === color.colorSpace)
    : undefined;
  if (color.colorSpace && !colorSpace) {
    throw new TypeError("DrawParam color references an unknown OFD color space.");
  }
  return [ofdXmlElement(name, {
    Value: color.value?.map(formatOFDNumber).join(" "),
    Index: color.index,
    ColorSpace: colorSpace?.id,
    Alpha: color.alpha
  })];
}

/**
 * Maps public device color-space names to GB/T 33190 XML values.
 *
 * @param type - Public typed color-space family.
 * @returns Standard resource XML type token.
 */
function colorSpaceTypeToXml(
  type: "DeviceGray" | "DeviceRGB" | "DeviceCMYK"
): "GRAY" | "RGB" | "CMYK" {
  if (type === "DeviceGray") return "GRAY";
  return type === "DeviceRGB" ? "RGB" : "CMYK";
}

/**
 * Compiles document multimedia resources.
 *
 * @param document - Assigned document.
 * @returns Complete `DocumentRes.xml`.
 */
export function createOFDDocumentResourcesXml(
  document: OFDAssignedDocument
): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:Res", {
    "xmlns:ofd": "http://www.ofdspec.org/2016",
    BaseLoc: "Res"
  }, [
    ...(document.images.length > 0 ? [ofdXmlElement("ofd:MultiMedias", {}, document.images.map((image) =>
      ofdXmlElement("ofd:MultiMedia", {
        ID: image.id,
        Type: "Image",
        Format: image.source.format
      }, [
        ofdXmlElement("ofd:MediaFile", {}, [image.relativePath])
      ])
    ))] : []),
    ...(document.compositeGraphicUnits.length > 0
      ? [ofdXmlElement("ofd:CompositeGraphicUnits", {}, document.compositeGraphicUnits.map((unit) =>
          ofdXmlElement("ofd:CompositeGraphicUnit", {
            ID: unit.id,
            Width: formatOFDNumber(unit.source.options.width),
            Height: formatOFDNumber(unit.source.options.height),
            Thumbnail: resolveOFDThumbnailId(document, unit.source.options.thumbnail)
          }, [ofdXmlElement("ofd:Content", { ID: unit.contentId }, unit.layers.map((layer) =>
            ofdXmlElement("ofd:Layer", {
              ID: layer.id,
              Type: layer.source.options.type ?? "Body"
            }, layer.objects.map((child) => compileOFDPageBlockChild(child, document)))
          ))])
        ))]
      : [])
  ]));
}

/**
 * Resolves an optional composite thumbnail image to its assigned resource ID.
 *
 * @param document - Assigned document resource graph.
 * @param thumbnail - Optional typed thumbnail image handle.
 * @returns Assigned image ID, or undefined without a thumbnail.
 */
function resolveOFDThumbnailId(
  document: OFDAssignedDocument,
  thumbnail: OFDAssignedDocument["source"]["compositeGraphicUnits"][number]["options"]["thumbnail"]
): string | undefined {
  if (!thumbnail) return undefined;
  const image = document.images.find((candidate) => candidate.source === thumbnail);
  if (!image) throw new TypeError("Composite graphic unit references an unknown thumbnail.");
  return image.id;
}

/**
 * Compiles attachment metadata.
 *
 * @param document - Assigned document.
 * @returns Complete `Attachments.xml`.
 */
export function createOFDAttachmentsXml(
  document: OFDAssignedDocument
): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:Attachments", {
    "xmlns:ofd": "http://www.ofdspec.org/2016"
  }, document.attachments.map((attachment) =>
    ofdXmlElement("ofd:Attachment", {
      ID: attachment.id,
      Name: attachment.source.options.name,
      Format: attachment.source.options.format,
      CreationDate: attachment.source.options.creationDate
        ? normalizeOFDAttachmentDate(attachment.source.options.creationDate)
        : undefined,
      ModDate: attachment.source.options.modificationDate
        ? normalizeOFDAttachmentDate(attachment.source.options.modificationDate)
        : undefined,
      Size: Number((attachment.source.data.byteLength / 1024).toFixed(6)),
      Visible: attachment.source.options.visible,
      Usage: attachment.source.options.usage
    }, [
      ofdXmlElement("ofd:FileLoc", {}, [attachment.relativePath])
    ])
  )));
}
