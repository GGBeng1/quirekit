import { formatWordNumberingMarker } from "../resolver";
import type { WordNumberingPresetContribution } from "./types";
import type {
  WordNumberingGalleryTile,
  WordNumberingPreviewLine
} from "./types";

const previewLineCount = 3;

/**
 * Projects installed semantic presets into renderer-neutral gallery thumbnails.
 *
 * @param presets - Validated semantic presets in deterministic registry order.
 * @returns Ordered and bullet tiles; task presets remain in their dedicated control.
 */
export function createWordNumberingGalleryTiles(
  presets: readonly WordNumberingPresetContribution[]
): readonly WordNumberingGalleryTile[] {
  return Object.freeze(presets.flatMap((preset) => {
    if (preset.kind === "task") return [];
    return [{
      presetId: preset.id,
      kind: preset.kind,
      scope: preset.scope,
      lines: createPreviewLines(preset)
    }];
  }));
}

/**
 * Creates three representative lines for one semantic preset.
 *
 * @param preset - Validated single-level or multilevel preset.
 * @returns Immutable marker lines with presentation-only indentation depths.
 */
function createPreviewLines(
  preset: WordNumberingPresetContribution
): readonly WordNumberingPreviewLine[] {
  const levels = preset.scope === "singleLevel"
    ? { "0": { ...preset.level, level: 0 } }
    : preset.levels;
  return Array.from({ length: previewLineCount }, (_value, index) => {
    const level = levels[String(preset.scope === "singleLevel" ? 0 : index)]!;
    return {
      marker: formatWordNumberingMarker(level, levels, {
        [level.level]: level.start + (preset.scope === "singleLevel" ? index : 0)
      }),
      depth: preset.scope === "singleLevel" ? 0 : index,
      definition: level
    };
  });
}
