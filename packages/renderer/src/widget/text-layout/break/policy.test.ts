import { describe, expect, it } from "vitest";
import {
  describeQuireTextSegment,
  isQuireTextHardBreak,
  mergeQuireTextBreakMetadata
} from "./policy";

const NBSP = String.fromCharCode(0x00a0);
const SOFT_HYPHEN = String.fromCharCode(0x00ad);
const LINE_SEPARATOR = String.fromCharCode(0x2028);

describe("describeQuireTextSegment", () => {
  it("classifies ASCII word characters as word with no break", () => {
    expect(describeQuireTextSegment("a")).toEqual({
      kind: "word",
      breakAfter: false,
      nonBreakingGlue: false
    });
  });

  it("classifies CJK graphemes as independently breakable", () => {
    expect(describeQuireTextSegment("世")).toEqual({
      kind: "grapheme",
      breakAfter: false,
      nonBreakingGlue: false
    });
  });

  it("treats NBSP as non-breaking glue", () => {
    expect(describeQuireTextSegment(NBSP)).toEqual({
      kind: "word",
      breakAfter: false,
      nonBreakingGlue: true
    });
  });

  it("allows a break after an ordinary hyphen", () => {
    expect(describeQuireTextSegment("-")).toEqual({
      kind: "word",
      breakAfter: true,
      nonBreakingGlue: false
    });
  });

  it("records a soft hyphen as a discretionary break with a marker", () => {
    expect(describeQuireTextSegment(SOFT_HYPHEN)).toEqual({
      kind: "word",
      breakAfter: true,
      nonBreakingGlue: false,
      breakMarker: "-"
    });
  });

  it("treats whitespace as a break opportunity", () => {
    expect(describeQuireTextSegment(" ")).toEqual({
      kind: "space",
      breakAfter: true,
      nonBreakingGlue: false
    });
  });

  it("treats newline and Unicode separators as hard breaks", () => {
    expect(describeQuireTextSegment("\n").kind).toBe("hardBreak");
    expect(isQuireTextHardBreak(LINE_SEPARATOR)).toBe(true);
    expect(isQuireTextHardBreak("a")).toBe(false);
  });
});

describe("mergeQuireTextBreakMetadata", () => {
  it("keeps glue when any segment is glued and takes break-after from the last", () => {
    expect(
      mergeQuireTextBreakMetadata([
        { breakAfter: false, nonBreakingGlue: true },
        { breakAfter: true, nonBreakingGlue: false }
      ])
    ).toEqual({ breakAfter: true, nonBreakingGlue: true });
  });
});
