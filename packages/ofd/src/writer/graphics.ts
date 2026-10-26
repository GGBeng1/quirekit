import {
  ofdXmlElement,
  type OFDXmlElement
} from "../xml";
import type {
  OFDClip,
  OFDColor,
  OFDGraphicObjectState
} from "../model/types";
import type { OFDAction } from "../action";
import type { OFDDrawParam } from "../resources";
import {
  encodeOFDText,
  formatOFDBox,
  formatOFDColor,
  formatOFDMatrix,
  formatOFDNumber,
  formatOFDPath
} from "./format";
import type {
  OFDAssignedDocument,
  OFDAssignedGraphic
} from "./types";
import { compileOFDActions } from "./action";

/**
 * Compiles one assigned graphic object.
 *
 * @param graphic - Assigned graphic.
 * @param document - Assigned document.
 * @returns Typed OFD XML element.
 */
export function compileOFDGraphic(
  graphic: OFDAssignedGraphic,
  document: OFDAssignedDocument
): OFDXmlElement {
  if (graphic.source.type === "text") {
    return compileText(graphic, graphic.source, document);
  }
  if (graphic.source.type === "image") {
    return compileImage(graphic, graphic.source, document);
  }
  if (graphic.source.type === "composite") {
    return compileComposite(graphic, graphic.source, document);
  }
  return compilePath(graphic, graphic.source, document);
}

/**
 * Compiles one text object.
 *
 * @param graphic - Assigned graphic.
 * @param source - Text object.
 * @param document - Assigned document.
 * @returns TextObject element.
 */
function compileText(
  graphic: OFDAssignedGraphic,
  source: Extract<OFDGraphicObjectState, { type: "text" }>,
  document: OFDAssignedDocument
): OFDXmlElement {
  const font = document.fonts.find((candidate) =>
    candidate.source.resourceIndex === source.options.font.resourceIndex
  );
  if (!font) throw new TypeError("Text references an unknown OFD font.");
  const children: OFDXmlElement[] = [];
  appendClips(children, source.options.clips);
  appendColor(children, "ofd:FillColor", source.options.fillColor);
  appendColor(children, "ofd:StrokeColor", source.options.strokeColor);
  children.push(...(source.options.glyphTransforms ?? []).map((transform) =>
    ofdXmlElement("ofd:CGTransform", {
      CodePosition: transform.codePosition,
      CodeCount: transform.codeCount,
      GlyphCount: transform.glyphs.length
    }, [
      ofdXmlElement("ofd:Glyphs", {}, [
        transform.glyphs.map(String).join(" ")
      ])
    ])
  ));
  children.push(...source.options.codes.map((code) =>
    ofdXmlElement("ofd:TextCode", {
      X: formatOFDNumber(code.x),
      Y: formatOFDNumber(code.y),
      DeltaX: code.deltaX?.map(formatOFDNumber).join(" "),
      DeltaY: code.deltaY?.map(formatOFDNumber).join(" ")
    }, [encodeOFDText(code.text)])
  ));
  appendGraphicActions(children, document, source.options.actions);
  return ofdXmlElement("ofd:TextObject", {
    ID: graphic.id,
    Boundary: formatOFDBox(source.options.boundary),
    Font: font.id,
    DrawParam: resolveOFDDrawParamId(document, source.options.drawParam),
    Size: formatOFDNumber(source.options.size),
    Stroke: source.options.strokeColor ? "true" : "false",
    Fill: source.options.fillColor || !source.options.strokeColor
      ? "true"
      : "false",
    Alpha: source.options.alpha,
    CTM: source.options.ctm
      ? formatOFDMatrix(source.options.ctm)
      : undefined
  }, children);
}

/**
 * Compiles one path object.
 *
 * @param graphic - Assigned graphic.
 * @param source - Path object.
 * @param document - Assigned document.
 * @returns PathObject element.
 */
function compilePath(
  graphic: OFDAssignedGraphic,
  source: Extract<OFDGraphicObjectState, { type: "path" }>,
  document: OFDAssignedDocument
): OFDXmlElement {
  const children: OFDXmlElement[] = [];
  appendClips(children, source.options.clips);
  appendColor(children, "ofd:FillColor", source.options.fillColor);
  appendColor(children, "ofd:StrokeColor", source.options.strokeColor);
  children.push(ofdXmlElement(
    "ofd:AbbreviatedData",
    {},
    [formatOFDPath(source.options.commands)]
  ));
  appendGraphicActions(children, document, source.options.actions);
  return ofdXmlElement("ofd:PathObject", {
    ID: graphic.id,
    Boundary: formatOFDBox(source.options.boundary),
    DrawParam: resolveOFDDrawParamId(document, source.options.drawParam),
    Stroke: source.options.strokeColor ? "true" : "false",
    Fill: source.options.fillColor ? "true" : "false",
    Rule: source.options.fillRule,
    LineWidth: source.options.lineWidth === undefined
      ? undefined
      : formatOFDNumber(source.options.lineWidth),
    Cap: source.options.lineCap,
    Join: source.options.lineJoin,
    DashPattern: source.options.dashPattern?.map(formatOFDNumber).join(" "),
    Alpha: source.options.alpha,
    CTM: source.options.ctm
      ? formatOFDMatrix(source.options.ctm)
      : undefined
  }, children);
}

/**
 * Compiles one image object.
 *
 * @param graphic - Assigned graphic.
 * @param source - Image object.
 * @param document - Assigned document.
 * @returns ImageObject element.
 */
function compileImage(
  graphic: OFDAssignedGraphic,
  source: Extract<OFDGraphicObjectState, { type: "image" }>,
  document: OFDAssignedDocument
): OFDXmlElement {
  const image = document.images.find((candidate) => candidate.source === source.image)
    ?? document.pageImages.find((candidate) => candidate.source === source.image);
  if (!image) throw new TypeError("Image object references an unknown resource.");
  const boundary = source.options.boundary;
  const children: OFDXmlElement[] = [];
  appendClips(children, source.options.clips);
  const border = source.options.border;
  if (border) {
    children.push(ofdXmlElement("ofd:Border", {
      LineWidth: formatOFDNumber(border.lineWidth),
      HorizonalCornerRadius: border.cornerRadius === undefined
        ? undefined
        : formatOFDNumber(border.cornerRadius),
      VerticalCornerRadius: border.cornerRadius === undefined
        ? undefined
        : formatOFDNumber(border.cornerRadius),
      DashPattern: border.dashPattern?.map(formatOFDNumber).join(" ")
    }, [
      ofdXmlElement("ofd:BorderColor", {
        Value: formatOFDColor(border.color),
        Alpha: border.color.alpha
      })
    ]));
  }
  appendGraphicActions(children, document, source.options.actions);
  return ofdXmlElement("ofd:ImageObject", {
    ID: graphic.id,
    Boundary: formatOFDBox(boundary),
    ResourceID: image.id,
    DrawParam: resolveOFDDrawParamId(document, source.options.drawParam),
    CTM: formatOFDMatrix(source.options.ctm ?? [
      boundary.width,
      0,
      0,
      boundary.height,
      0,
      0
    ]),
    Alpha: source.options.alpha
  }, children);
}

/**
 * Compiles one placed reusable composite graphic.
 *
 * @param graphic - Assigned composite object.
 * @param source - Composite object source state.
 * @param document - Assigned document resource graph.
 * @returns CompositeObject element.
 */
function compileComposite(
  graphic: OFDAssignedGraphic,
  source: Extract<OFDGraphicObjectState, { type: "composite" }>,
  document: OFDAssignedDocument
): OFDXmlElement {
  const composite = document.compositeGraphicUnits.find((candidate) =>
    candidate.source.source === source.composite
  );
  if (!composite) {
    throw new TypeError("CompositeObject references an unknown composite graphic unit.");
  }
  const children: OFDXmlElement[] = [];
  appendClips(children, source.options.clips);
  appendGraphicActions(children, document, source.options.actions);
  return ofdXmlElement("ofd:CompositeObject", {
    ID: graphic.id,
    Boundary: formatOFDBox(source.options.boundary),
    ResourceID: composite.id,
    DrawParam: resolveOFDDrawParamId(document, source.options.drawParam),
    Alpha: source.options.alpha,
    CTM: source.options.ctm
      ? formatOFDMatrix(source.options.ctm)
      : undefined
  }, children);
}

/**
 * Resolves one graphic's optional drawing-parameter resource ID.
 *
 * @param document - Assigned document resource graph.
 * @param drawParam - Optional typed drawing-parameter handle.
 * @returns Assigned numeric ID, or undefined when no parameter is selected.
 */
function resolveOFDDrawParamId(
  document: OFDAssignedDocument,
  drawParam: OFDDrawParam | undefined
): string | undefined {
  if (!drawParam) return undefined;
  const assigned = document.drawParams.find((candidate) =>
    candidate.source === drawParam
  );
  if (!assigned) throw new TypeError("Graphic references an unknown OFD DrawParam.");
  return assigned.id;
}

/**
 * Appends graphic click actions after the graphic's paint and clipping children.
 *
 * @param children - Mutable graphic child sink.
 * @param document - Assigned document when actions need reference resolution.
 * @param actions - Optional ordered graphic actions.
 */
function appendGraphicActions(
  children: OFDXmlElement[],
  document: OFDAssignedDocument | undefined,
  actions: readonly OFDAction[] | undefined
): void {
  if (!document || !actions) return;
  const compiled = compileOFDActions(document, actions, "CLICK");
  if (compiled) children.push(compiled);
}

/**
 * Appends one optional color element.
 *
 * @param children - Mutable child sink.
 * @param name - Qualified color element name.
 * @param color - Optional color.
 */
function appendColor(
  children: OFDXmlElement[],
  name: "ofd:FillColor" | "ofd:StrokeColor",
  color: OFDColor | undefined
): void {
  if (!color) return;
  children.push(ofdXmlElement(name, {
    Value: formatOFDColor(color),
    Alpha: color.alpha
  }));
}

/**
 * Appends object clipping areas.
 *
 * @param children - Mutable child sink.
 * @param clips - Optional clipping areas.
 */
function appendClips(
  children: OFDXmlElement[],
  clips: readonly OFDClip[] | undefined
): void {
  if (!clips || clips.length === 0) return;
  children.push(ofdXmlElement("ofd:Clips", {
    TransFlag: false
  }, clips.map((clip) =>
    ofdXmlElement("ofd:Clip", {}, [
      ofdXmlElement("ofd:Area", {}, [
        ofdXmlElement("ofd:Path", {
          Boundary: formatOFDBox(clip.boundary),
          Stroke: false,
          Fill: true
        }, [
          ofdXmlElement(
            "ofd:AbbreviatedData",
            {},
            [formatOFDPath(clip.commands)]
          )
        ])
      ])
    ])
  )));
}
