import { createTheme } from "@quirekit/ui";
import { createSimpleMindMapEditor, type MindMapEditor } from "@quirekit/mind-map-simple";
import type { MindEditorOptions } from "../types";
import { mindEditorAppearance } from "../theme/appearance";

/** @param options - Source, browser host, lifetime and theme. @returns An isolated editor ready for user input. */
export async function createMindEditor(options: MindEditorOptions): Promise<MindMapEditor> {
  const { theme = createTheme(), ...surface } = options;
  return createSimpleMindMapEditor({ ...surface, appearance: mindEditorAppearance(theme) });
}
