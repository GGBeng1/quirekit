import { wordListMarkerMenuHandlerId, wordTaskMarkerToggleHandlerId } from "../interaction/constants";
import { resolveWordParagraphNumbering } from "../model/validation";
import { resolveWordNumberingMarkers } from "../resolver/markers";
import { resolveWordNumberingTab } from "../resolver/tabs";
import type { ResolvedWordNumberingMarker, WordNumberingMarkerEventPayload } from "../types";
import { resolveWordNumberingMarkerTypography } from "./marker-typography";
import type { WordNumberingModelSemantics } from "./types";

const twipsPerCssPixel = 15;

/**
 * Creates Word list-marker semantics for a layout engine's paragraph model.
 *
 * Markers handed back by the engine are the resolved Word markers this model
 * produced, so each method reads them as such.
 *
 * @returns Marker semantics backed by the Word numbering resolver.
 */
export function createWordNumberingModelSemantics(): WordNumberingModelSemantics {
  return {
    listMarkers: (doc) => resolveWordNumberingMarkers(doc),
    markerTab(marker, end, characterPitch) {
      const word = marker as ResolvedWordNumberingMarker;
      const target = resolveWordNumberingTab(
        end * twipsPerCssPixel, word.tabs ?? [], characterPitch / (1 / twipsPerCssPixel), word.defaultTabStopTwips
      );
      return { position: target.positionTwips / twipsPerCssPixel, defaultGrid: target.source === "default-grid" };
    },
    markerTypography(marker, bodyFont, theme, inheritance) {
      const word = marker as ResolvedWordNumberingMarker;
      const typography = resolveWordNumberingMarkerTypography(word, bodyFont, theme, inheritance);
      const sizePt = word.markerStyle?.fontSizePt;
      return sizePt === undefined ? typography : { ...typography, explicitFontSize: sizePt * 96 / 72 };
    },
    markerTarget(marker, range) {
      const word = marker as ResolvedWordNumberingMarker;
      const payload: WordNumberingMarkerEventPayload = {
        position: word.position,
        range,
        kind: word.kind,
        numId: word.numId,
        level: word.level,
        text: word.text,
        checked: word.checked
      };
      return {
        handler: word.kind === "task" ? wordTaskMarkerToggleHandlerId : wordListMarkerMenuHandlerId,
        payload,
        owner: { id: word.numId, name: "wordNumbering", metadata: { level: word.level, kind: word.kind, checked: word.checked } }
      };
    },
    isCheckedTask: (textblock) => resolveWordParagraphNumbering(textblock.attrs.wordNumbering)?.task?.checked === true
  };
}
