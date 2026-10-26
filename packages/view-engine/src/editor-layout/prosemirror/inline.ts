import { collectSingleUnmarkedInlineTextRuns } from "./inline/plain";
import { resolveQuireTextBaselineShift, resolveQuireTextMetricStyle } from "@quirekit/layout/text";
import { prepareInlineStyleCascade } from "./inline/cascade";
import { resolveInlineEmphasisMark } from "./inline/emphasis";
import { isQuireForcedInlineBreak, visitInlineDescendants } from "./inline/descendants";
import type {
  QuireInlineSourceAnchor,
  QuireInlineTextRun
} from "@quirekit/layout/inline";
import type {
  QuireInlineSourceCapabilitySidecar,
  QuireInlineSourceTextStyle
} from "../../layout/engine/inline/source-capability";
import {
  applyQuireComplexScriptEmphasis,
  resolveQuireMarkedBackgroundColor,
  resolveQuireMarkedColor,
  resolveQuireMarkedComplexScriptEmphasis,
  resolveQuireMarkedHiddenText,
  resolveQuireMarkedFont,
  resolveQuireMarkedFontSet,
  resolveQuireMarkedLanguageSet,
  resolveQuireMarkedRunDirection,
  resolveQuireMarkedTextTransform,
  projectQuireMarkedText,
  resolveQuireMarkedTextDecoration
} from "./font";
import { createInlineReplacementRun, createInlineSourceProduct } from "./inline/source";
import type { QuireProseMirrorInlineSourceOptions, QuireProseMirrorInlineSources, QuireProseMirrorInlineSourceProducts, QuireProseMirrorInlineSourceAnchorOptions } from "./inline/types";
export type { QuireProseMirrorInlineSourceOptions, QuireProseMirrorInlineSources, QuireProseMirrorInlineSourceProducts, QuireProseMirrorInlineSourceAnchorOptions } from "./inline/types";
import type { QuireDocumentFontSet } from "@quirekit/core";
import { resolveQuireCanvasGlyphEffects } from "@quirekit/core";
import { splitQuireDocumentFontRuns } from "./document-font-theme";
import { styleDeltas } from "./typography/shared";
import { resolveInlineCharacterGrid } from "./inline/character-grid";

/**
 * Collects non-text inline source identity without resolving text styles.
 *
 * Estimated off-viewport blocks use this path so viewport realization changes
 * geometry only; it cannot make logical inline sources appear or disappear.
 *
 * @param options - Textblock and absolute source bounds to inspect.
 * @returns Non-text inline source anchors in document order.
 */
export function collectQuireProseMirrorInlineSourceProducts(
  options: QuireProseMirrorInlineSourceAnchorOptions
): QuireProseMirrorInlineSourceProducts {
  const anchors: QuireInlineSourceAnchor[] = [];
  const capabilities: QuireInlineSourceCapabilitySidecar[] = [];

  visitInlineDescendants(options.node, (child, offset): void => {
    if ((child.isText && child.text) || child.type.spec.linebreakReplacement === true || isQuireForcedInlineBreak(child)) {
      return;
    }

    const product = createInlineSourceProduct(
      child,
      offset,
      options.contentStart,
      options.contentEnd,
      options.sourceId,
      options.sourceCapabilityRegistry
    );
    anchors.push(product.anchor);
    if (product.capability !== undefined) {
      capabilities.push(product.capability);
    }
  });

  return { sourceAnchors: anchors, sourceCapabilities: capabilities };
}

/**
 * Builds renderer-neutral inline sources for a ProseMirror textblock.
 *
 * @param options - Textblock, document bounds, font, and style resolver inputs.
 * @returns Text runs plus explicit non-text source anchors.
 */
export function collectQuireProseMirrorInlineSources(
  options: QuireProseMirrorInlineSourceOptions
): QuireProseMirrorInlineSources {
  const {
    node, contentStart, contentEnd, sourceId, font: baseFont, lineHeight,
    textBaselineOffset, resolveMarkStyle, documentFontSet, documentFontTable,
    sourceCapabilityRegistry, resolveFontSelection
  } = options;
  const nodeStyle = options.nodeStyle ?? null;
  const hiddenTextViewMode = options.hiddenTextViewMode ?? "normal";
  const simpleRuns = options.characterGrid ? null : collectSingleUnmarkedInlineTextRuns(
    node,
    contentStart,
    baseFont,
    resolveMarkStyle,
    nodeStyle,
    documentFontSet,
    documentFontTable,
    resolveFontSelection
  );

  if (simpleRuns !== null) {
    return { textRuns: simpleRuns, sourceAnchors: [], sourceCapabilities: [] };
  }

  const runs: QuireInlineTextRun[] = [];
  const sourceAnchors: QuireInlineSourceAnchor[] = [];
  const sourceCapabilities: QuireInlineSourceCapabilitySidecar[] = [];

  visitInlineDescendants(
    node,
    /**
     * Adds a text child as a measured inline run.
     *
     * @param child - Inline child node from the textblock.
     * @param offset - Child offset relative to the textblock content.
     */
    (child, offset): void => {
      const from = contentStart + offset;
      const to = from + child.nodeSize;
      if (to > contentEnd) {
        throw new RangeError(
          `Inline child ${child.type.name} exceeds textblock content range.`
        );
      }

      const cascade = prepareInlineStyleCascade(child.marks, resolveMarkStyle, nodeStyle);
      const directMarks = cascade.direct, resolveDirect = cascade.resolve, inheritedStyle = cascade.inherited;
      // Schema-owned line breaks occupy one source position but participate in
      // text flow, not object capability placement. Preserve their marked style.
      const sourceText = child.isText ? child.text
        : child.type.spec.linebreakReplacement === true || isQuireForcedInlineBreak(child) ? "\n" : undefined;
      if (!sourceText) {
        const color = resolveQuireMarkedColor(directMarks, resolveDirect, inheritedStyle) ?? inheritedStyle?.color;
        const textStyle = lineHeight === undefined || textBaselineOffset === undefined
          ? undefined
          : {
              font: resolveQuireMarkedFont(
                baseFont,
                directMarks,
                resolveDirect,
                inheritedStyle
              ),
              ...(color === undefined ? {} : { color }),
              lineHeight,
              baselineOffset: textBaselineOffset
            } satisfies QuireInlineSourceTextStyle;
        const product = createInlineSourceProduct(
          child,
          offset,
          contentStart,
          contentEnd,
          sourceId,
          sourceCapabilityRegistry,
          textStyle
        );
        sourceAnchors.push(product.anchor);
        if (product.capability !== undefined) {
          sourceCapabilities.push(product.capability);
        }
        const replacement = createInlineReplacementRun(
          product,
          from,
          to,
          textStyle?.font ?? baseFont,
          child.marks.map((mark) => mark.type.name),
          textStyle?.color
        );
        if (replacement !== undefined) {
          runs.push(replacement);
        }
        return;
      }

      const marks = child.marks.map((mark) => mark.type.name);
      const color = resolveQuireMarkedColor(directMarks, resolveDirect, inheritedStyle) ?? inheritedStyle?.color;
      const backgroundColor = resolveQuireMarkedBackgroundColor(
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const textDecoration = resolveQuireMarkedTextDecoration(directMarks, resolveDirect, inheritedStyle);
      const underline = directMarks.map(mark => resolveDirect(mark)?.underline).filter(value => value !== undefined).at(-1) ?? inheritedStyle?.underline;
      const glyphEffects = resolveQuireCanvasGlyphEffects(
        styleDeltas(directMarks, resolveDirect, inheritedStyle)
      );
      const hidden = resolveQuireMarkedHiddenText(directMarks, resolveDirect, inheritedStyle);
      const hiddenText = hidden === true
        ? hiddenTextViewMode === "formatting-inspection"
          ? "inspection" as const
          : "collapsed" as const
        : undefined;

      const resolvedFont = resolveQuireMarkedFont(
        baseFont,
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const markedFontSet = resolveQuireMarkedFontSet(directMarks, resolveDirect, inheritedStyle);
      const complexScriptEmphasis = resolveQuireMarkedComplexScriptEmphasis(
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const { horizontalScale, letterSpacing, baselineShiftEm, characterGrid } = resolveQuireTextMetricStyle(
        styleDeltas(directMarks, resolveDirect, inheritedStyle)
      );
      const languageSet = resolveQuireMarkedLanguageSet(
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const emphasisMark = resolveInlineEmphasisMark(directMarks, resolveDirect, inheritedStyle, languageSet?.eastAsia);
      const direction = resolveQuireMarkedRunDirection(
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const textTransform = resolveQuireMarkedTextTransform(
        directMarks,
        resolveDirect,
        inheritedStyle
      );
      const effectiveFontSet = mergeMarkedFontSet(documentFontSet, markedFontSet);
      const resolveSlot = resolveFontSelection?.(styleDeltas(directMarks, resolveDirect, inheritedStyle));
      const themedRuns = markedFontSet === undefined
        && documentFontSet === undefined
        && complexScriptEmphasis === undefined
        && languageSet === undefined
        && direction === undefined
        && resolveSlot === undefined
        && !options.characterGrid
        ? [{ from: 0, to: sourceText.length, text: sourceText, font: resolvedFont }]
        : splitQuireDocumentFontRuns({
            text: sourceText,
            font: resolvedFont,
            fontSet: effectiveFontSet ?? {},
            resolveSlot,
            ...(direction === undefined ? {} : { forceSlot: "complexScript" as const }),
            ...(documentFontTable === undefined ? {} : { fontTable: documentFontTable })
          });
      for (const themedRun of themedRuns) {
        const finalFont = "slot" in themedRun
          && themedRun.slot === "complexScript"
          && complexScriptEmphasis !== undefined
          ? applyQuireComplexScriptEmphasis(
              themedRun.font,
              complexScriptEmphasis
            )
          : themedRun.font;
        const baselineShift = resolveQuireTextBaselineShift(baselineShiftEm, finalFont);
        const grid = resolveInlineCharacterGrid(options.characterGrid, characterGrid,
          "slot" in themedRun ? themedRun.slot : undefined);
        runs.push({
          text: projectQuireMarkedText(themedRun.text, textTransform),
          ...(isQuireForcedInlineBreak(child) ? { breakAfter: child.type.spec.quireInlineBreak as "page" | "column" } : {}),
          range: { from: from + themedRun.from, to: from + themedRun.to },
          font: finalFont,
          ...(grid === undefined ? {} : { characterGrid: grid }),
          ...("slot" in themedRun
            && languageSet?.[themedRun.slot] !== undefined
            ? { language: languageSet[themedRun.slot] }
            : {}),
          ...(color === undefined ? {} : { color }),
          ...(backgroundColor === undefined ? {} : { backgroundColor }),
          ...(textDecoration === undefined ? {} : { textDecoration }),
          ...(underline === undefined ? {} : { underline }),
          ...(emphasisMark === undefined ? {} : { emphasisMark }),
          ...(glyphEffects === undefined ? {} : { glyphEffects }),
          ...(hiddenText === undefined ? {} : { hiddenText }),
          ...(baselineShift === undefined ? {} : { baselineShift }),
          ...(letterSpacing === undefined ? {} : { letterSpacing }),
          ...(horizontalScale === undefined ? {} : { horizontalScale }),
          ...(direction === undefined ? {} : { direction }),
          marks
        });
      }
    }
  );

  return { textRuns: runs, sourceAnchors, sourceCapabilities };
}

/**
 * Merges direct script overrides over the inherited document font role.
 *
 * @param inherited - Document role inherited by the textblock.
 * @param direct - Script fields contributed by direct text marks.
 * @returns Effective slot set, or undefined when neither source exists.
 */
function mergeMarkedFontSet(
  inherited: QuireDocumentFontSet | undefined,
  direct: QuireDocumentFontSet | undefined
): QuireDocumentFontSet | undefined {
  if (inherited === undefined && direct === undefined) return undefined;
  return {
    ...inherited,
    ...direct,
    fallbacks: direct?.fallbacks ?? inherited?.fallbacks
  };
}
