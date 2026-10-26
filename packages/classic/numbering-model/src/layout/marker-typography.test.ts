import type { QuireDocumentFontTheme } from "@quirekit/core";
import type { ResolvedWordNumberingMarker } from "../types";
import { describe, expect, it } from "vitest";
import {
  resolveWordNumberingMarkerTypography
} from "./marker-typography";

const documentFontTheme: QuireDocumentFontTheme = {
  body: {
    latin: "Body Latin",
    eastAsia: "Body East Asia",
    complexScript: "Body Complex"
  },
  heading: {
    latin: "Heading Latin",
    eastAsia: "Heading East Asia",
    complexScript: "Heading Complex"
  }
};

const markerBase: ResolvedWordNumberingMarker = {
  position: 0,
  text: "1.",
  kind: "ordered",
  numId: "1",
  level: 0,
  suffix: "space",
  justification: "start",
  levelIndentation: { start: null, end: null, firstLine: null },
  indentation: { start: null, end: null, firstLine: null },
  checked: null
};

describe("Word numbering marker typography", () => {
  it.each([
    ["majorAscii", "Heading Latin"],
    ["majorHAnsi", "Heading Latin"],
    ["majorEastAsia", "Heading East Asia"],
    ["majorBidi", "Heading Complex"],
    ["minorAscii", "Body Latin"],
    ["minorHAnsi", "Body Latin"],
    ["minorEastAsia", "Body East Asia"],
    ["minorBidi", "Body Complex"]
  ] as const)("resolves %s through the document theme", (theme, expected) => {
    expect(resolveWordNumberingMarkerTypography(
      {
        ...markerBase,
        markerStyle: {
          fonts: {
            ascii: "Literal Marker",
            asciiTheme: theme
          }
        }
      },
      "16px Paragraph Font",
      documentFontTheme
    ).font).toBe(`16px "${expected}"`);
  });

  it("falls back from an unresolved theme slot to the matching literal family", () => {
    expect(resolveWordNumberingMarkerTypography(
      {
        ...markerBase,
        markerStyle: {
          fonts: {
            ascii: "Literal Marker",
            asciiTheme: "minorEastAsia"
          }
        }
      },
      "16px Paragraph Font",
      { body: { latin: "Body Latin" } }
    ).font).toBe('16px "Literal Marker"');
  });

  it("inherits paragraph-mark paint fields before marker-level overrides", () => {
    expect(resolveWordNumberingMarkerTypography(
      markerBase,
      "bold 16px Paragraph Font",
      undefined,
      {
        textColor: "#2563EB",
        textDecoration: ["underline", "line-through"]
      }
    )).toMatchObject({
      textColor: "#2563EB",
      textDecoration: ["underline", "line-through"]
    });

    expect(resolveWordNumberingMarkerTypography(
      {
        ...markerBase,
        markerStyle: {
          color: "#FF0000",
          underline: false,
          strike: true
        }
      },
      "bold 16px Paragraph Font",
      undefined,
      {
        textColor: "#2563EB",
        textDecoration: ["underline"]
      }
    )).toMatchObject({
      textColor: "#FF0000",
      textDecoration: ["line-through"]
    });
  });
});
