import type { DrawingAppearance, DrawingStroke } from "@quirekit/drawing-geometry";
import type { QuireWidgetBoxStyle } from "@quirekit/renderer";

/**
 * Projects canonical Word drawing appearance into renderer-neutral box paint.
 *
 * @param appearance - Validated fill and outline appearance.
 * @returns Box paint shared by Canvas and SVG widget compilation.
 */
export function createWordDrawingBoxStyle(
  appearance: DrawingAppearance
): QuireWidgetBoxStyle {
  if (appearance.stroke.kind === "none") {
    return {
      fill: createPaintColor(
        appearance.fill.color,
        appearance.fill.opacity
      ),
      stroke: { color: "transparent", width: 0 }
    };
  }

  const lineDash = createStrokeDash(
    appearance.stroke.dash,
    appearance.stroke.width
  );
  return {
    fill: createPaintColor(appearance.fill.color, appearance.fill.opacity),
    stroke: {
      color: createPaintColor(
        appearance.stroke.color,
        appearance.stroke.opacity
      ),
      width: appearance.stroke.width,
      ...(lineDash === undefined ? {} : { lineDash })
    }
  };
}

/**
 * Applies canonical opacity to one CSS paint token.
 *
 * OOXML-authored RGB tokens receive stable rgba output. Other valid CSS color
 * tokens use CSS color mixing so mounted backends preserve alpha without
 * teaching the renderer about Word paint semantics.
 *
 * @param color - Solid color token or null for disabled paint.
 * @param opacity - Canonical opacity from zero through one.
 * @returns CSS color consumed by both mounted paint backends.
 */
function createPaintColor(color: string | null, opacity: number): string {
  if (color === null) {
    return "transparent";
  }
  if (opacity === 1) {
    return color;
  }

  const rgb = readHexRgb(color);
  if (rgb !== undefined) {
    return `rgba(${rgb.join(", ")}, ${opacity})`;
  }
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}

/**
 * Reads short or full opaque hexadecimal RGB.
 *
 * @param color - Candidate CSS color.
 * @returns RGB channels, or undefined for another CSS color form.
 */
function readHexRgb(color: string): readonly [number, number, number] | undefined {
  if (/^#[\da-f]{3}$/i.test(color)) {
    const rgb = color.slice(1);
    return [
      Number.parseInt(rgb.charAt(0).repeat(2), 16),
      Number.parseInt(rgb.charAt(1).repeat(2), 16),
      Number.parseInt(rgb.charAt(2).repeat(2), 16)
    ];
  }
  return !/^#[\da-f]{6}$/i.test(color)
    ? undefined
    : [
        Number.parseInt(color.slice(1, 3), 16),
        Number.parseInt(color.slice(3, 5), 16),
        Number.parseInt(color.slice(5, 7), 16)
      ];
}

/**
 * Converts one canonical Word dash preset into width-scaled path lengths.
 *
 * @param dash - Canonical outline dash preset.
 * @param width - Accepted outline width in layout units.
 * @returns Alternating dash/gap lengths, or undefined for a solid outline.
 */
function createStrokeDash(
  dash: DrawingStroke["dash"],
  width: number
): readonly number[] | undefined {
  if (dash === "solid") {
    return undefined;
  }
  const unit = Math.max(1, width);
  if (dash === "dash") {
    return [unit * 4, unit * 2];
  }
  if (dash === "dot") {
    return [unit, unit * 2];
  }
  return [unit * 4, unit * 2, unit, unit * 2];
}
