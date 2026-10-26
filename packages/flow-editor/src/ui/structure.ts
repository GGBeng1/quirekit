import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
import { canQuickCreate, flowQuickCreateItems } from "./connected";
import { isSequenceParticipant } from "@quirekit/flowchart";

/** @param state - Small selection projection. @returns Shared Menu actions with selection-specific availability, without graph subscriptions. */
export function flowStructureItems(state: FlowchartEditorState): readonly QuireKitMenuEntry[] {
  const participants = state.selectedShapes.filter(isSequenceParticipant).length;
  const single = state.selectedIds.length === 1 && participants === 1, pair = state.selectedIds.length === 2 && participants === 2;
  const lane = state.selectedIds.length === 1 && state.selectedShapes.some(shape => shape === "lane-horizontal" || shape === "lane-vertical");
  const lanes: readonly QuireKitMenuEntry[] = [
    { value: "insert-lane-horizontal", label: "添加横向泳道" }, { value: "insert-lane-vertical", label: "添加纵向泳道" },
    { value: "swimlanes", label: "泳道操作", kind: "submenu", disabled: !lane, children: [
      { value: "swimlane-add", label: "在后面添加泳道" }, { value: "swimlane-before", label: "泳道前移" }, { value: "swimlane-after", label: "泳道后移" },
      { value: "swimlane-equalize", label: "统一泳道尺寸" }, { value: "swimlane-phase", label: "添加阶段分隔线" }, { value: "swimlane-remove", label: "删除泳道及内容", tone: "danger" },
    ] },
  ];
  const sequence: readonly QuireKitMenuEntry[] = [
    { value: "sequence-participant", label: "添加参与者" }, { value: "sequence-actor", label: "添加人物参与者" },
    { value: "sequence-activation", label: "添加激活条", disabled: !single },
    { value: "sequence-message", label: "添加请求消息", disabled: !pair }, { value: "sequence-reply", label: "添加返回消息", disabled: !pair },
    { value: "sequence-async", label: "添加异步消息", disabled: !pair }, { value: "sequence-self", label: "添加自调用", disabled: !single },
    { value: "sequence-edit", label: "编辑时序消息", kind: "submenu", disabled: state.selectedKind !== "edge" || state.selectedIds.length !== 1 || state.selectionLocked, children: [
      { value: "sequence-insert-before", label: "在前面插入请求" }, { value: "sequence-insert-after", label: "在后面插入请求" },
      { value: "sequence-move-up", label: "消息行上移", icon: "arrowUp" }, { value: "sequence-move-down", label: "消息行下移", icon: "arrowDown" },
      { value: "sequence-remove-message", label: "删除消息并收拢", tone: "danger" },
    ] },
    { value: "sequence-destroy", label: "销毁参与者", disabled: !single },
    { value: "fragments", label: "时序片段", kind: "submenu", children: [
      { value: "sequence-alt", label: "alt · 条件分支" }, { value: "sequence-opt", label: "opt · 可选执行" }, { value: "sequence-loop", label: "loop · 循环" },
    ] },
  ];
  return [
    { value: "media-upload", label: "图片 / SVG…", icon: "image" },
    { value: "media-icons", label: "常用图标…", icon: "layoutGrid" },
    { value: "media-edit", label: "编辑图片…", icon: "image", disabled: state.selectedIds.length !== 1 || state.selectedShapes[0] !== "image" || state.selectionLocked },
    { value: "sep-media", label: "", kind: "separator" },
    { value: "quick-right-same", label: "向右添加相同图形", icon: "workflow", disabled: !canQuickCreate(state) },
    { value: "quick-create", label: "选择方向与图形", icon: "gitBranch", kind: "submenu", disabled: !canQuickCreate(state), children: flowQuickCreateItems() },
    { value: "sep-structure", label: "", kind: "separator" },
    { value: "insert-container", label: "添加分层容器", icon: "layers" },
    { value: "lanes", label: "泳道", icon: "columns2", kind: "submenu", children: lanes },
    { value: "sequence", label: "时序图", icon: "listTree", kind: "submenu", children: sequence },
  ];
}
