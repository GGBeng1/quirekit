import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";

/**
 * Wraps freshly built text paint in its fixed line's vertical clip band.
 * @param commands - Destination command stream, including this fragment's paint.
 * @param start - First command belonging to the fragment.
 * @param fragment - Positioned fragment whose rectangle owns the line band.
 * @param commandId - Base paint identity shared with command-cache rebasing.
 */
export function clipFixedLineTextCommands(
  commands: QuireDisplayCommand[],
  start: number,
  fragment: QuireTextFragment,
  commandId: string
): void {
  if (fragment.clipToLine !== true || commands.length === start) return;
  // Line clips constrain the block axis only. Retain generous inline overhang
  // for italic glyphs and effects; page/table owners still apply their own clips.
  const overhang = Math.max(
    fragment.lineHeight,
    (fragment.runAscent ?? 0) + (fragment.runDescent ?? 0)
  );
  commands.push({
    id: `${commandId}:line-clip`,
    kind: "clip",
    range: fragment.range,
    rect: {
      x: fragment.rect.x - overhang,
      y: fragment.rect.y,
      width: fragment.rect.width + overhang * 2,
      height: fragment.rect.height
    },
    commands: commands.splice(start)
  });
}
