import type {
  WordNumberingLevel,
  WordNumberingMarkerFonts,
  WordNumberingMarkerStyle
} from "../types";
import type { WordNumberingSingleLevelPreset } from "./types";

/**
 * Clones and freezes one complete canonical level tuple.
 *
 * @param level - Valid source level.
 * @returns Owned immutable level.
 */
export function cloneWordNumberingPresetLevel(
  level: WordNumberingLevel
): WordNumberingLevel {
  const paragraphIndentation = Object.freeze({
    start: cloneMeasurement(level.paragraphIndentation.start),
    end: cloneMeasurement(level.paragraphIndentation.end),
    firstLine: cloneMeasurement(level.paragraphIndentation.firstLine)
  });
  const markerStyle = level.markerStyle === undefined
    ? undefined
    : cloneMarkerStyle(level.markerStyle);
  return Object.freeze({
    ...level,
    paragraphIndentation,
    ...(level.paragraphTabs === undefined ? {} : {
      paragraphTabs: Object.freeze(level.paragraphTabs.map(tab => Object.freeze({
        ...tab, position: Object.freeze({ ...tab.position })
      })))
    }),
    ...(markerStyle === undefined ? {} : { markerStyle })
  });
}

/**
 * Removes the synthetic destination index from one cloned level.
 *
 * @param level - Owned level temporarily mapped to level zero.
 * @returns Frozen portable single-level tuple.
 */
export function createOwnedSingleLevelPreset(
  level: WordNumberingLevel
): WordNumberingSingleLevelPreset {
  const {
    level: _level,
    restartAfterLevel,
    ...portable
  } = level;
  return Object.freeze({
    ...portable,
    ...(restartAfterLevel === null ? { restartAfterLevel: null } : {})
  });
}

/**
 * Clones one nullable paragraph measurement.
 *
 * @param measurement - Canonical retained measurement.
 * @returns Owned immutable measurement or null.
 */
function cloneMeasurement<T extends { readonly unit: string; readonly value: number }>(
  measurement: T | null
): T | null {
  return measurement === null ? null : Object.freeze({ ...measurement });
}

/**
 * Clones one admitted marker-style delta.
 *
 * @param style - Valid canonical marker style.
 * @returns Owned immutable marker style.
 */
function cloneMarkerStyle(
  style: WordNumberingMarkerStyle
): WordNumberingMarkerStyle {
  const fonts = style.fonts === undefined ? undefined : cloneMarkerFonts(style.fonts);
  const language = style.language === undefined
    ? undefined
    : Object.freeze({ ...style.language });
  return Object.freeze({
    ...style,
    ...(fonts === undefined ? {} : { fonts }),
    ...(language === undefined ? {} : { language })
  });
}

/**
 * Clones one marker font-slot record.
 *
 * @param fonts - Valid canonical marker font slots.
 * @returns Owned immutable font slots.
 */
function cloneMarkerFonts(
  fonts: WordNumberingMarkerFonts
): WordNumberingMarkerFonts {
  return Object.freeze({ ...fonts });
}
