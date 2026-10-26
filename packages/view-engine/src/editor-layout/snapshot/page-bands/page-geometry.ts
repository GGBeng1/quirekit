import {
  resolveQuirePageGeometryForIndex,
  type QuirePageGeometry
} from "@quirekit/layout/pagination";
import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageBand, QuirePageSection } from "../../../document-profile/types";
import type {
  QuirePageBandStorySourceLayout,
  ResolveQuirePageBandPageGeometryOptions
} from "./types";

/**
 * Resolves effective body frames after measuring the stories selected for page bands.
 *
 * The result remains a clone-safe page geometry value. First, even, and later
 * odd pages can therefore travel through the same page driver, checkpoint key,
 * and worker boundary as ordinary margin-derived geometry.
 *
 * @param options - Page model, base page geometry, and measured stories.
 * @returns Page geometry whose body variants respect measured band boundaries.
 */
export function resolveQuirePageBandPageGeometry(
  options: ResolveQuirePageBandPageGeometryOptions
): QuirePageGeometry {
  const leading = options.pageModel.leadingSection(options.documentNode);
  if (leading === null || options.sources.length === 0) {
    return options.pageGeometry;
  }
  const section = options.section ?? leading;
  if (options.pageModel.sectionPageGeometry(section, options.pageGeometry.pageRect) === undefined) {
    return options.pageGeometry;
  }

  const sources = new Map(options.sources.map((source) => [source.storyId, source]));
  const variant = (pageIndex: number) => resolveEffectiveBodyRect({ options, section, sources, pageIndex });
  return {
    ...options.pageGeometry,
    bodyRectVariants: { first: variant(0), even: variant(1), odd: variant(2) }
  };
}

/** Inputs shared while resolving one representative physical page body. */
interface ResolveEffectiveBodyRectOptions {
  /** Top-level band-aware geometry request. */
  readonly options: ResolveQuirePageBandPageGeometryOptions;
  /** Section owning the page. */
  readonly section: QuirePageSection;
  /** Measured story sources keyed by persisted id. */
  readonly sources: ReadonlyMap<string, QuirePageBandStorySourceLayout>;
  /** Representative zero-based physical page index. */
  readonly pageIndex: number;
}

/**
 * Clamps a representative page body against measured band boundaries.
 *
 * @param input - Page selection, source layouts, and section.
 * @returns Effective body rectangle expressed in first-page coordinates.
 */
function resolveEffectiveBodyRect(
  input: ResolveEffectiveBodyRectOptions
): QuireRect {
  const { pageGeometry, pageModel } = input.options;
  const pageOffset = input.pageIndex
    * (pageGeometry.pageRect.height + (pageGeometry.pageGap ?? 0));
  const resolvedGeometry = resolveQuirePageGeometryForIndex(
    pageGeometry,
    input.pageIndex
  );
  const baseBodyRect = {
    ...resolvedGeometry.bodyRect,
    y: resolvedGeometry.bodyRect.y - pageOffset
  };
  const headerBottom = resolveBandBoundary(input, "header");
  const footerTop = resolveBandBoundary(input, "footer");
  const bodyTop = pageModel.bandClampsBody(input.section, "header") && headerBottom !== null
    ? Math.max(baseBodyRect.y, headerBottom)
    : baseBodyRect.y;
  const baseBodyBottom = baseBodyRect.y + baseBodyRect.height;
  const bodyBottom = pageModel.bandClampsBody(input.section, "footer") && footerTop !== null
    ? Math.min(baseBodyBottom, footerTop)
    : baseBodyBottom;

  return {
    x: baseBodyRect.x,
    y: bodyTop,
    width: baseBodyRect.width,
    height: Math.max(0, bodyBottom - bodyTop)
  };
}

/**
 * Resolves the measured lower header or upper footer boundary for one page.
 *
 * @param input - Page selection and measured story inputs.
 * @param band - Band boundary to resolve.
 * @returns First-page-coordinate boundary, or `null` when no story is selected.
 */
function resolveBandBoundary(
  input: ResolveEffectiveBodyRectOptions,
  band: QuirePageBand
): number | null {
  const { pageModel, documentNode, pageGeometry } = input.options;
  const storyId = pageModel.bandStory({
    doc: documentNode,
    section: input.section,
    band,
    sectionPageIndex: input.pageIndex
  });
  const source = storyId === null ? undefined : input.sources.get(storyId);
  const distance = pageModel.bandDistance(input.section, band);
  if (source === undefined || source.kind !== band || distance === null) {
    return null;
  }

  const pageRect = pageGeometry.pageRect;
  return band === "header"
    ? pageRect.y + distance + source.layout.rect.height
    : pageRect.y + pageRect.height - distance - source.layout.rect.height;
}
