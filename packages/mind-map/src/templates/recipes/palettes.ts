import type { MindMapTemplatePalette } from "../types";

/** Document colors deliberately persist across host theme changes. */
export const palettes = {
  blue: { root: "#4855ec", accents: ["#4855ec"], tints: ["#eef0ff"] },
  slate: { root: "#26364a", accents: ["#52677f"], tints: ["#eaf0f6"] },
  ink: { root: "#303741", accents: ["#56606e"], tints: ["#ffffff"] },
  coral: { root: "#b94b57", accents: ["#b94b57", "#a86739", "#a35278"], tints: ["#fff0f1", "#fff3e8", "#faedf4"] },
  ocean: { root: "#087e8b", accents: ["#087e8b", "#276b91"], tints: ["#e7f5f5", "#eaf3fa"] },
  forest: { root: "#356a4b", accents: ["#356a4b", "#687239"], tints: ["#edf5ee", "#f3f5e9"] },
  amber: { root: "#9a5b18", accents: ["#a76620", "#91743a"], tints: ["#fff3df", "#f8f2e5"] },
  violet: { root: "#7650a4", accents: ["#7650a4", "#9b567c"], tints: ["#f3edfa", "#faedf3"] },
  spectrum: { root: "#37445e", accents: ["#33715a", "#b2692a", "#416ba8", "#a0526d"],
    tints: ["#edf6ef", "#fff2e3", "#edf3fc", "#faedf2"] },
} as const satisfies Record<string, MindMapTemplatePalette>;
