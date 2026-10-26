import type {
  QuireDisplayCommand,
  QuireTextPaintCommand
} from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";

/**
 * Appends one text command plus its paint-only legacy Word effect passes.
 *
 * The input command already owns authoritative layout, shaping, source range,
 * and caret geometry. This compiler only translates paint origins/bounds or
 * switches the final face to stroke mode; it never measures text again.
 *
 * @param commands - Mutable display command sink.
 * @param command - Canonical readable text command.
 * @param fragment - Measured fragment carrying canonical glyph effects.
 */
export function appendLegacyGlyphEffectCommands(
  commands: QuireDisplayCommand[],
  command: QuireTextPaintCommand,
  fragment: QuireTextFragment
): void {
  const effects = fragment.glyphEffects;
  if (effects === undefined || effects.length === 0) {
    commands.push(command);
    return;
  }

  const fontSize = resolveCommandFontSize(command.font, fragment);
  const offset = clamp(fontSize / 16, 1, 2);

  if (effects.includes("shadow")) {
    commands.push(createOffsetFillCommand(
      command,
      "shadow",
      offset,
      offset,
      command.fillStyle,
      0.35
    ));
  }
  if (effects.includes("emboss")) {
    commands.push(createOffsetFillCommand(
      command,
      "emboss-dark",
      offset,
      offset,
      "#000000",
      0.45
    ));
    commands.push(createOffsetFillCommand(
      command,
      "emboss-light",
      -offset,
      -offset,
      "#ffffff",
      0.65
    ));
  }
  if (effects.includes("imprint")) {
    commands.push(createOffsetFillCommand(
      command,
      "imprint-light",
      offset,
      offset,
      "#ffffff",
      0.65
    ));
    commands.push(createOffsetFillCommand(
      command,
      "imprint-dark",
      -offset,
      -offset,
      "#000000",
      0.45
    ));
  }

  if (effects.includes("outline")) {
    const lineWidth = clamp(fontSize / 24, 0.75, 1.5);
    commands.push({
      ...command,
      id: `${command.id}:effect:outline`,
      rect: {
        x: command.rect.x - lineWidth / 2,
        y: command.rect.y - lineWidth / 2,
        width: command.rect.width + lineWidth,
        height: command.rect.height + lineWidth
      },
      paintMode: "stroke",
      strokeStyle: command.fillStyle,
      lineWidth
    });
    return;
  }

  commands.push(command);
}

/**
 * Creates one translated fill pass without changing source or shaped glyphs.
 *
 * @param command - Canonical text command to clone.
 * @param suffix - Stable effect-pass id suffix.
 * @param dx - Horizontal paint translation.
 * @param dy - Vertical paint translation.
 * @param fillStyle - Fill used by the translated pass.
 * @param opacity - Effect opacity multiplied by command opacity.
 * @returns Translated text command.
 */
function createOffsetFillCommand(
  command: QuireTextPaintCommand,
  suffix: string,
  dx: number,
  dy: number,
  fillStyle: string,
  opacity: number
): QuireTextPaintCommand {
  return {
    ...command,
    id: `${command.id}:effect:${suffix}`,
    geometryRole: "decoration",
    rect: {
      ...command.rect,
      x: command.rect.x + dx,
      y: command.rect.y + dy
    },
    origin: {
      x: command.origin.x + dx,
      y: command.origin.y + dy
    },
    fillStyle,
    paintMode: "fill",
    opacity: (command.opacity ?? 1) * opacity
  };
}

/**
 * Resolves the CSS pixel font size used for deterministic effect offsets.
 *
 * @param font - CSS font shorthand carried by the text command.
 * @param fragment - Fragment supplying a metric fallback.
 * @returns Positive CSS pixel font size.
 */
function resolveCommandFontSize(font: string, fragment: QuireTextFragment): number {
  const match = /(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|\/|$)/u.exec(font);
  const parsed = match?.[1] === undefined ? Number.NaN : Number.parseFloat(match[1]);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Math.max(
    1,
    (fragment.runAscent ?? fragment.rect.height * 0.8)
      + (fragment.runDescent ?? fragment.rect.height * 0.2)
  );
}

/**
 * Clamps one finite effect metric to a closed interval.
 *
 * @param value - Candidate metric.
 * @param minimum - Lower bound.
 * @param maximum - Upper bound.
 * @returns Clamped metric.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
