import type { QuireLoadedShaperFont } from "../types";
import {
  normalizeQuireFontFamily,
  parseQuireFontRequest
} from "./request";
import {
  canQuireFontShapeText,
  doesQuireFontFamilyMatch,
  selectClosestQuireFont
} from "./matching";
import { splitQuireTextIntoSegments } from "./segments";
import type {
  QuireFontRequest,
  QuireFontResolver,
  QuireFontResolverOptions,
  QuireResolvedFontRun
} from "./types";

/** Concrete canvas font resolver implementation. */
class DefaultCanvasFontResolver implements QuireFontResolver {
  /** Loaded fonts available to the resolver. */
  private readonly fonts: readonly QuireLoadedShaperFont[];

  /** Ordered fallback family names. */
  private readonly fallbackFamilies: readonly string[];

  /**
   * Creates a resolver from loaded fonts and fallback families.
   *
   * @param options - Loaded fonts and fallback family names.
   */
  constructor(options: QuireFontResolverOptions) {
    this.fonts = options.fonts;
    this.fallbackFamilies = options.fallbackFamilies ?? [];
  }

  /**
   * Resolves one text run into concrete font slices.
   *
   * @param text - Text content to resolve.
   * @param font - CSS font shorthand requested by layout.
   * @returns Font-resolved text slices.
   */
  resolveTextRuns(text: string, font: string): readonly QuireResolvedFontRun[] {
    const request = parseQuireFontRequest(font);
    const segments = splitQuireTextIntoSegments(text);
    const runs: QuireResolvedFontRun[] = [];

    for (const segment of segments) {
      const resolvedFont = this.resolveFontForSegment(segment.text, request);

      if (!resolvedFont) {
        continue;
      }

      const previous = runs.at(-1);

      if (previous?.font === resolvedFont && previous.to === segment.from) {
        runs[runs.length - 1] = {
          ...previous,
          to: segment.to,
          text: previous.text + segment.text
        };
        continue;
      }

      runs.push({
        from: segment.from,
        to: segment.to,
        text: segment.text,
        font: resolvedFont
      });
    }

    return runs;
  }

  /**
   * Resolves one grapheme segment to the first matching font with coverage.
   *
   * @param text - Segment text.
   * @param request - Parsed CSS font request.
   * @returns Matching loaded font, or null when no font is available.
   */
  private resolveFontForSegment(
    text: string,
    request: QuireFontRequest
  ): QuireLoadedShaperFont | null {
    for (const family of this.resolveFamilySearchOrder(request)) {
      const font = this.findBestFontForFamily(family, request, text);

      if (font) {
        return font;
      }
    }

    return this.findBestFontForAnyFamily(request, text);
  }

  /**
   * Builds the family search order for one request.
   *
   * @param request - Parsed CSS font request.
   * @returns Requested families followed by resolver fallbacks.
   */
  private resolveFamilySearchOrder(request: QuireFontRequest): readonly string[] {
    const ordered = [...request.families, ...this.fallbackFamilies];
    const seen = new Set<string>();

    return ordered.filter((family) => {
      const normalized = normalizeQuireFontFamily(family);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);

      return true;
    });
  }

  /**
   * Finds the best loaded font for a family and text segment.
   *
   * @param family - Requested CSS font family.
   * @param request - Parsed CSS font request.
   * @param text - Text segment requiring coverage.
   * @returns Matching loaded font, or null.
   */
  private findBestFontForFamily(
    family: string,
    request: QuireFontRequest,
    text: string
  ): QuireLoadedShaperFont | null {
    const candidates = this.fonts
      .filter((font) => doesQuireFontFamilyMatch(font, family))
      .filter((font) => canQuireFontShapeText(font, text));

    return selectClosestQuireFont(candidates, request);
  }

  /**
   * Finds the best loaded font across all families.
   *
   * @param request - Parsed CSS font request.
   * @param text - Text segment requiring coverage.
   * @returns Matching loaded font, or null.
   */
  private findBestFontForAnyFamily(
    request: QuireFontRequest,
    text: string
  ): QuireLoadedShaperFont | null {
    return selectClosestQuireFont(
      this.fonts.filter((font) => canQuireFontShapeText(font, text)),
      request
    );
  }
}

/**
 * Creates a font resolver for loaded shaping fonts.
 *
 * @param options - Loaded fonts and fallback families.
 * @returns Font resolver that can split text by fallback coverage.
 */
export function createQuireFontResolver(
  options: QuireFontResolverOptions
): QuireFontResolver {
  return new DefaultCanvasFontResolver(options);
}
