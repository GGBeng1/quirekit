import type { MindMapTemplate, MindMapTemplateId } from "@quirekit/mind-map";
import { isMindEditorEnglish } from "./resolve";

const english: Readonly<Record<MindMapTemplateId, readonly [string, string]>> = {
  blank: ["Blank mind map", "Start with space to explore"],
  classic: ["Classic blue", "Two-sided branches, clear hierarchy"],
  minimal: ["Minimal ink", "Monochrome lines, focus on content"],
  coral: ["Coral inspiration", "Soft colors, one-way growth"],
  ocean: ["Ocean bubbles", "Rounded topics, branching ideas"],
  business: ["Business blue", "Left-facing structure, crisp lines"],
  weekly: ["Weekly plan", "Bring work and life into focus"],
  project: ["Project planning", "Goals, execution and review"],
  meeting: ["Meeting notes", "Capture decisions and next steps"],
  product: ["Product planning", "Connect users, features and value"],
  event: ["Event planning", "From first idea to the event itself"],
  goals: ["Goal breakdown", "Turn big goals into next actions"],
  study: ["Study notes", "Understand, practice and retain"],
  reading: ["Reading notes", "Turn ideas into understanding"],
  travel: ["Travel plan", "Plan ahead and explore"],
  review: ["Personal review", "Reflect on progress and adjust"],
  decision: ["Compare options", "Compare value, cost and risk"],
  swot: ["SWOT analysis", "Strengths, weaknesses, opportunities, threats"],
  marketing: ["4P marketing", "Product, price, place and promotion"],
  research: ["Research", "From questions to evidence and conclusions"],
};
/** @param template - Canonical catalog entry; document text is never translated.
 * @param locale - Interface language. @returns Localized catalog metadata only. */
export function mindEditorTemplateLabels(template: MindMapTemplate, locale: string): Pick<MindMapTemplate, "title" | "description"> {
  const translated = isMindEditorEnglish(locale) ? english[template.id] : undefined;
  return translated ? { title: translated[0], description: translated[1] } : { title: template.title, description: template.description };
}
