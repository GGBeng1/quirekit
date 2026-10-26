import type { WordParagraphFormatting } from "../types";
import type { WordParagraphModelFormatting } from "./types";

/**
 * Projects admitted absolute stops without exposing Word units to the engine.
 *
 * Unadmitted stops remain canonical and round-trip through DOCX. No projection
 * is preferable to guessing decimal/bar/clear semantics during pagination.
 *
 * @param formatting - Effective paragraph formatting after style resolution.
 * @returns Neutral explicit stops, or undefined for inherited/unsupported tabs.
 */
export function projectWordParagraphTabs(
  formatting: WordParagraphFormatting
): WordParagraphModelFormatting["tabs"] {
  const stops = formatting.tabs;
  if (stops === null || stops.length === 0 || stops.some((stop) =>
    stop.position.unit !== "dxa"
    || !["start", "end", "center"].includes(stop.alignment)
    || (stop.leader != null && !["none", "dot", "hyphen", "underscore"].includes(stop.leader))
  )) return undefined;
  return { stops: stops.map((stop) => ({
    position: stop.position.value / 15,
    alignment: stop.alignment as "start" | "end" | "center",
    ...(!stop.leader || stop.leader === "none" ? {} : { leader: ({ dot: ".", hyphen: "-", underscore: "_" } as Record<string, string>)[stop.leader]! })
  })).sort((a, b) => a.position - b.position) };
}
