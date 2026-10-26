import { createTheme } from "@quirekit/ui";
import { createX6FlowchartEditor, type FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowEditorOptions } from "../types";
import { flowEditorAppearance } from "../theme/appearance";
/** @param options - Container, source, permission and theme. @returns Initialized shared authoring controller. */
export function createFlowEditor(options: FlowEditorOptions): Promise<FlowchartEditor> {
  const { theme = createTheme(), ...rest } = options;
  return createX6FlowchartEditor({ ...rest, appearance: flowEditorAppearance(theme) });
}
