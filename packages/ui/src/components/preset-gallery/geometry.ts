import { themeVariableReferences } from "../../theme";

/** Theme-derived default preview width, shared by CSS and the Vue adapter. */
export const presetGalleryMinimumWidth = `calc(${themeVariableReferences.spacing.major} * 3)`;

/**
 * Count actual visible CSS grid tracks, excluding collapsed auto-fit columns.
 *
 * @param template - Resolved grid-template-columns from the public gallery grid.
 * @returns At least one column for Ark's navigation model.
 */
export function countPresetGalleryColumns(template: string): number {
  return Math.max(1, template.trim().split(/\s+/u).filter((track) => {
    const width = Number.parseFloat(track);
    return Number.isFinite(width) && width > 0;
  }).length);
}

/**
 * Keep a host's maximum column constraint finite and positive.
 *
 * @param value - Requested maximum column count.
 * @returns A whole positive column count, or the default four columns.
 */
export function normalizePresetGalleryColumns(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 4;
}
