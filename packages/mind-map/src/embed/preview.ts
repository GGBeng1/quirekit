import type { MindMapEmbed } from "./types";

/** @param embed - Envelope. @returns Image address for display, or null before the first save. */
export function mindMapPreviewSource(embed: Pick<MindMapEmbed, "preview">): string | null {
  return embed.preview?.url ?? embed.preview?.dataUrl ?? null;
}
