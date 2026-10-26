import { describe, expect, it } from "vitest";
import { OFDDocument } from "../document";

const fontBytes = Uint8Array.of(0x00, 0x01, 0x00, 0x00, 0x51, 0x4b);
const pngBytes = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a
);

describe("OFD document model validation", describeOFDDocumentModelValidation);

/** Defines focused numeric and structural model validation coverage. */
function describeOFDDocumentModelValidation(): void {
  it("rejects invalid graphic coordinates and measurements", testGraphicNumbers);
  it("rejects invalid destination, permission, and viewer numbers", testDocumentNumbers);
}

/** Verifies every graphic numeric field is checked before serialization. */
function testGraphicNumbers(): void {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const image = document.embedImage(pngBytes);
  const page = document.addPage({ width: 210, height: 297 });
  page.drawText("A", {
    boundary: { x: 0, y: 0, width: 10, height: 10 },
    codes: [{ text: "A", x: Number.NaN, y: 0, deltaX: [Number.POSITIVE_INFINITY] }],
    ctm: [1, 0, 0, 1, 0, Number.POSITIVE_INFINITY],
    font,
    size: Number.NaN
  });
  page.drawPath({
    boundary: { x: 0, y: 0, width: 10, height: 10 },
    commands: [
      { type: "move", x: 0, y: 0 },
      {
        type: "arc",
        radiusX: 0,
        radiusY: 1,
        rotation: Number.NaN,
        largeArc: false,
        sweep: true,
        x: Number.POSITIVE_INFINITY,
        y: 1
      }
    ],
    dashPattern: [0, 0],
    lineWidth: 0
  });
  page.drawImage(image, {
    boundary: { x: 0, y: 0, width: 10, height: 10 },
    border: {
      color: { value: [0, 0, 0] },
      cornerRadius: -1,
      dashPattern: [-1, 1],
      lineWidth: Number.NaN
    }
  });

  expect(document.validate().map((issue) => issue.message)).toEqual(expect.arrayContaining([
    "Page 0 object 0 has an invalid CTM.",
    "Page 0 object 0 has an invalid FontSize.",
    "Page 0 object 0 has invalid TextCode coordinates.",
    "Page 0 object 1 has an invalid path coordinate.",
    "Page 0 object 1 has an invalid LineWidth.",
    "Page 0 object 1 has an invalid DashPattern.",
    "Page 0 object 2 has an invalid image border."
  ]));
}

/** Verifies navigation and document preferences reject unusable numeric values. */
function testDocumentNumbers(): void {
  const document = OFDDocument.create({
    metadata: { usage: "EMagazine" as never }
  });
  const page = document.addPage({ width: 210, height: 297 });
  document.addBookmark({
    name: "Start",
    destination: {
      left: Number.NaN,
      page,
      zoom: Number.POSITIVE_INFINITY,
      type: "FitRect" as never
    }
  });
  const template = document.addTemplatePage({
    width: 210,
    height: 297,
    zOrder: "Body" as never
  });
  page.addTemplate(template, { zOrder: "Body" as never });
  document.setPermissions({ printCopies: 1.5 });
  document.setViewerPreferences({ zoomScale: 0 });

  document.setViewerPreferences({
    zoomMode: "FitWidth",
    zoomScale: 1
  } as never);

  expect(document.validate().map((issue) => issue.message)).toEqual(expect.arrayContaining([
    "An OFD destination has invalid target coordinates.",
    "An OFD destination has an invalid type.",
    "OFD permissions have an invalid print copy count.",
    "OFD viewer preferences cannot specify both zoomMode and zoomScale.",
    "Invalid GB/T 33190-2016 DocUsage: \"EMagazine\".",
    "Template 0 has an invalid ZOrder.",
    "Page 0 has an invalid template ZOrder."
  ]));
}
