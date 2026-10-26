import {
  resolveWordParagraphBlockSpacing,
  resolveWordParagraphFormatting,
  resolveWordParagraphIndentation,
  resolveWordParagraphLineMetrics
} from "../model";
import { resolveWordParagraphJustifySoftBreaks } from "../compatibility/model";
import type { WordParagraphFormatting, WordParagraphIndentation } from "../types";
import type { WordParagraphModelSemantics } from "./types";

const cssPixelsPerTwip = 1 / 15;

/**
 * Creates Word paragraph semantics for a layout engine's paragraph model.
 *
 * Twip conversion happens here so the engine only receives CSS pixels.
 *
 * @returns Paragraph semantics backed by Word paragraph measurement rules.
 */
export function createWordParagraphModelSemantics(): WordParagraphModelSemantics {
  return {
    nodeIndentation: (node) => resolveWordParagraphFormatting(node.attrs.wordParagraph).indentation,
    resolveIndentation(indentation, characterPitch, characterGrid) {
      const source = indentation as WordParagraphIndentation;
      const resolved = resolveWordParagraphIndentation(
        source,
        Math.max(0, characterPitch + (characterGrid?.spacing ?? 0)) / cssPixelsPerTwip
      );
      // Relative indents follow paragraph typography before strict cells snap the
      // resulting distance. Absolute source lengths retain their explicit position.
      /** @param value - Resolved twips. @param relative - Whether source uses characters. @returns CSS pixel indent. */
      const project = (value: number, relative: boolean): number => {
        const pixels = value * cssPixelsPerTwip;
        return relative && characterGrid?.mode === "cells"
          ? Math.round(pixels / characterGrid.pitch) * characterGrid.pitch : pixels;
      };
      return {
        start: project(resolved.startTwips, source?.start?.unit === "character"),
        end: project(resolved.endTwips, source?.end?.unit === "character"),
        firstLine: project(resolved.firstLineTwips, source?.firstLine?.unit === "character")
      };
    },
    justifySoftBreaks: (doc) => resolveWordParagraphJustifySoftBreaks(doc.attrs.wordParagraphCompatibility),
    lineMetrics: (formatting, naturalLineHeight, naturalBaselineOffset) => resolveWordParagraphLineMetrics(
      (formatting.token as WordParagraphFormatting).spacing.line, naturalLineHeight, naturalBaselineOffset
    ),
    blockSpacing: (formatting, lineHeight) =>
      resolveWordParagraphBlockSpacing((formatting.token as WordParagraphFormatting).spacing, lineHeight)
  };
}
