import type {
  OFDDrawTextOptions,
  OFDGraphicObjectState
} from "../model/types";
import { createOFDTextCode } from "./layout";

/**
 * Resolves public convenience text options into immutable explicit placement.
 *
 * @param text - Authored Unicode text.
 * @param options - Explicit codes or embedded-font convenience options.
 * @returns Internal text options containing explicit `TextCode` values.
 */
export function resolveOFDDrawTextOptions(
  text: string,
  options: OFDDrawTextOptions
): Extract<OFDGraphicObjectState, { type: "text" }>["options"] {
  const {
    codes,
    glyphTransforms,
    letterSpacing,
    origin,
    ...common
  } = options;
  if (codes) {
    if (origin !== undefined || letterSpacing !== undefined) {
      throw new TypeError(
        "Explicit OFD TextCode placement cannot also use origin or letterSpacing."
      );
    }
    return Object.freeze({
      ...common,
      codes: freezeTextCodes(codes),
      ...(glyphTransforms
        ? { glyphTransforms: freezeGlyphTransforms(glyphTransforms) }
        : {})
    });
  }

  const baseline = origin ?? { x: 0, y: options.size };
  return Object.freeze({
    ...common,
    codes: Object.freeze([createOFDTextCode(text, options.font, {
      x: baseline.x,
      y: baseline.y,
      size: options.size,
      ...(letterSpacing === undefined ? {} : { letterSpacing })
    })]),
    ...(glyphTransforms
      ? { glyphTransforms: freezeGlyphTransforms(glyphTransforms) }
      : {})
  });
}

/**
 * Copies caller-owned character-to-glyph mappings before storage.
 *
 * @param transforms - Explicit subset-font glyph mappings.
 * @returns Immutable copied mappings.
 */
function freezeGlyphTransforms(
  transforms: NonNullable<OFDDrawTextOptions["glyphTransforms"]>
): NonNullable<OFDDrawTextOptions["glyphTransforms"]> {
  return Object.freeze(transforms.map((transform) => Object.freeze({
    ...transform,
    glyphs: Object.freeze([...transform.glyphs])
  })));
}

/**
 * Copies caller-owned text codes and placement arrays before storage.
 *
 * @param codes - Explicit caller placement.
 * @returns Immutable copied placement.
 */
function freezeTextCodes(
  codes: readonly NonNullable<OFDDrawTextOptions["codes"]>[number][]
): readonly NonNullable<OFDDrawTextOptions["codes"]>[number][] {
  return Object.freeze(codes.map((code) => Object.freeze({
    ...code,
    ...(code.deltaX ? { deltaX: Object.freeze([...code.deltaX]) } : {}),
    ...(code.deltaY ? { deltaY: Object.freeze([...code.deltaY]) } : {})
  })));
}
