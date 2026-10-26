import { describe, expect, it } from "vitest";
import {
  attachQuireTextFragmentSource,
  type QuireShapedTextRun,
  type QuireTextFragment
} from "@quirekit/layout/text";
import { createTextFragmentCommandShiftSignatureByKeyParts } from "./signature";

describe("text fragment command signatures", () => {
  it("forwards a retained source fragment's shifted signature", () => {
    const source = createSignatureFragment({
      id: "source",
      rangeFrom: 10,
      shapedRun: {
        width: 40,
        ascent: 10,
        descent: 4,
        clusters: [],
        glyphs: []
      }
    });
    const sourceSignature = createTextFragmentCommandShiftSignatureByKeyParts(
      source,
      "paragraph-0#p1",
      "#111827"
    );
    const shifted = createSignatureFragment({
      id: "shifted",
      rangeFrom: 11,
      shapedRun: createThrowingShapedRun()
    });

    attachQuireTextFragmentSource(shifted, source);

    expect(
      createTextFragmentCommandShiftSignatureByKeyParts(
        shifted,
        "paragraph-0#p1",
        "#111827"
      )
    ).toBe(sourceSignature);
  });
});

/**
 * Creates a text fragment whose shifted command signature can be tested.
 *
 * @param input - Fragment id, range start, and shaped-run metadata.
 * @returns Text fragment with stable paint-equivalent geometry.
 */
function createSignatureFragment(input: {
  /** Stable fragment id. */
  readonly id: string;
  /** Document range start. */
  readonly rangeFrom: number;
  /** Shaped run carried by the fragment. */
  readonly shapedRun: QuireShapedTextRun;
}): QuireTextFragment {
  return {
    id: input.id,
    text: "Retained",
    range: { from: input.rangeFrom, to: input.rangeFrom + 8 },
    rect: { x: 24, y: 80, width: 72, height: 20 },
    font: "16px sans-serif",
    lineHeight: 20,
    baseline: 95,
    caretStops: [],
    shapedRun: input.shapedRun
  };
}

/**
 * Creates shaped-run metadata that fails if the current fragment is serialized.
 *
 * @returns Shaped-run-like object with throwing cluster access.
 */
function createThrowingShapedRun(): QuireShapedTextRun {
  return {
    width: 40,
    ascent: 10,
    descent: 4,
    get clusters(): never {
      throw new Error("current shaped run should not be serialized");
    },
    glyphs: []
  } as unknown as QuireShapedTextRun;
}
