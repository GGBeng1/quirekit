import type { MdDocxContainerAppearance, MdDocxContainerHeader } from "../docx/types";
import { highlightContainerName, parseHighlightAttributes } from "./attributes";
import type { MdHighlightColor } from "./types";

// Word has no CSS tokens; these approximate the light theme's surface and text tokens.
const fills: Readonly<Record<MdHighlightColor, string>> = { orange: "FFF4E5", red: "FDECEC", green: "EAF7EE", blue: "EAF2FE", purple: "F2EDFB", gray: "F2F3F5" };
const inks: Readonly<Record<MdHighlightColor, string>> = { orange: "B35C00", red: "C62828", green: "2E7D32", blue: "1F5FBF", purple: "6B3FB5", gray: "5F6368" };

/** @param header - Confirmed container fields. @returns Emoji icon column, borderless fill and optional text color for highlights; undefined keeps the template style. */
export function highlightDocxAppearance(header: MdDocxContainerHeader): MdDocxContainerAppearance | undefined {
  if (header.name !== highlightContainerName) return undefined;
  const attributes = parseHighlightAttributes(header.title);
  return { title: '', lead: attributes.emoji, fill: fills[attributes.color], border: null, ...(attributes.text ? { color: inks[attributes.text] } : {}) };
}
