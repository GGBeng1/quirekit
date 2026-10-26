import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
/** @param state - Session clipboard, selection and permission. @returns Shared menu actions with truthful compatible-target admission. */
export function flowFormatReuseItems(state: FlowchartEditorState): readonly QuireKitMenuEntry[] {
  const count = state.selectedIds.length, compatible = state.formatKind === "node" ? state.selectedStyle.nodeCount === count : state.formatKind === "edge" && state.selectedStyle.edgeCount === count;
  return [
    { value: "format-copy", label: "复制格式", icon: "clipboardCopy", disabled: state.composing || count !== 1 },
    { value: "format-paste", label: "粘贴格式", icon: "clipboardPaste", disabled: state.composing || state.readOnly || state.selectionLocked || !count || !compatible },
  ];
}
