import {
  compileQuireStorySourceLayout,
  type CompileQuirePageBandStorySourcesOptions
} from "../page-bands/source";
import type { QuirePageEndnoteSourceLayout, QuirePageFootnoteSourceLayout } from "./types";

/**
 * Measures every footnote body once at the body flow width.
 *
 * @param options - Shared story compilation services; `width` is the body measure width.
 * @returns Footnote sources in body reference order.
 */
export function compileQuirePageFootnoteSources(
  options: CompileQuirePageBandStorySourcesOptions
): readonly QuirePageFootnoteSourceLayout[] {
  const footnotes = options.pageModel.listFootnotes(options.state.doc);
  if (footnotes.length === 0) {
    return [];
  }
  const stories = new Map(options.pageModel.listStories(options.state.doc).map((story) => [story.id, story]));
  const sources: QuirePageFootnoteSourceLayout[] = [];
  for (const footnote of footnotes) {
    const story = stories.get(footnote.storyId);
    if (story === undefined) continue;
    sources.push({
      noteId: footnote.id,
      storyId: footnote.storyId,
      referencePosition: footnote.referencePosition,
      ...compileQuireStorySourceLayout(story, "footnote", options)
    });
  }
  return sources;
}

/**
 * Measures every end note body once at the body flow width.
 *
 * @param options - Shared story compilation services; `width` is the body measure width.
 * @returns End note sources in display order.
 */
export function compileQuirePageEndnoteSources(
  options: CompileQuirePageBandStorySourcesOptions
): readonly QuirePageEndnoteSourceLayout[] {
  const endnotes = options.pageModel.listEndnotes(options.state.doc);
  if (endnotes.length === 0) {
    return [];
  }
  const stories = new Map(options.pageModel.listStories(options.state.doc).map((story) => [story.id, story]));
  return endnotes.flatMap((endnote) => {
    const story = stories.get(endnote.storyId);
    return story === undefined ? [] : [{
      noteId: endnote.id,
      storyId: endnote.storyId,
      ...compileQuireStorySourceLayout(story, "endnote", options)
    }];
  });
}
