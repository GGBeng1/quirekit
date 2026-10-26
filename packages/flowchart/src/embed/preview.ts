import type { FlowchartEmbed } from "./types";

/** @param embed - Envelope. @returns Image address for display, or null before the first save. */
export function flowchartPreviewSource(embed: Pick<FlowchartEmbed, "preview">): string | null {
  return embed.preview?.url ?? embed.preview?.dataUrl ?? null;
}
