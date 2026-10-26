import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";

/** @param state - Document permissions and selection. @returns Whole-diagram actions, keeping export and library browsing available in read-only mode. */
export function flowFileItems(state: FlowchartEditorState): readonly QuireKitMenuEntry[] {
  return [
    { value: "template-blank", label: "新建空白图", icon: "filePlus", disabled: state.readOnly || state.presenting },
    { value: "templates", label: "从模板创建…", icon: "layoutGrid", disabled: state.readOnly || state.presenting },
    { value: "playback", label: "演示模式…", icon: "play" },
    { value: "library", label: "我的图形库…", icon: "folderOpen" },
    { value: "save-library", label: "保存到图形库", kind: "submenu", icon: "save", children: [
      { value: "library-template", label: "整张图存为模板" },
      { value: "library-component", label: "选区存为组件", disabled: !state.selectedIds.length },
    ] },
    { value: "sep-export", label: "", kind: "separator" },
    { value: "page-setup", label: "页面与打印…", icon: "printer" },
    { value: "export-json", label: "导出源文件（JSON）", icon: "fileCode" },
    { value: "export-svg", label: "导出矢量图（SVG）…", icon: "image" },
    { value: "export-png", label: "导出图片（PNG）…", icon: "download" },
  ];
}
