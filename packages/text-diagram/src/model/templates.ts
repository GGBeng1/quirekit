import type { TextDiagramTemplate } from "../types";
import { dotTemplates } from "./templates/dot";
import { mermaidTemplates } from "./templates/mermaid";
import { plantumlTemplates } from "./templates/plantuml";

/** @param locale - Language of newly created labels, never of existing source. @returns Real local-engine examples shared by every editor. */
export function textDiagramTemplates(locale = "zh-CN"): readonly TextDiagramTemplate[] {
  return [...mermaidTemplates(locale), ...plantumlTemplates(locale), ...dotTemplates(locale)];
}
