import type { FlowShortcutGroup } from "./types";

/** Presentation only, audited against the adapter's input bindings and navigation controls. */
export const flowShortcutColumns: readonly (readonly FlowShortcutGroup[])[] = [
  [
    { title: "编辑与历史", items: [
      { label: "撤销", keys: [["Ctrl/⌘", "Z"]] },
      { label: "重做", keys: [["Ctrl/⌘", "Shift", "Z"], ["Ctrl/⌘", "Y"]] },
      { label: "复制选区", keys: [["Ctrl/⌘", "C"]] },
      { label: "剪切选区", keys: [["Ctrl/⌘", "X"]] },
      { label: "粘贴图形", keys: [["Ctrl/⌘", "V"]] },
      { label: "复制图形", keys: [["Ctrl/⌘", "D"]] },
      { label: "删除选区", keys: [["Delete"], ["Backspace"]] },
      { label: "取消格式刷", keys: [["Esc"]] },
    ] },
    { title: "选择与移动", items: [
      { label: "全选", keys: [["Ctrl/⌘", "A"]] },
      { label: "组合", keys: [["Ctrl/⌘", "G"]] },
      { label: "取消组合", keys: [["Ctrl/⌘", "Shift", "G"]] },
      { label: "移动 1 px", keys: [["↑ / ↓ / ← / →"]] },
      { label: "移动 10 px", keys: [["Shift", "↑ / ↓ / ← / →"]] },
      { label: "打开右键菜单", keys: [["Shift", "F10"], ["Menu"]] },
    ] },
  ],
  [
    { title: "演示播放", items: [
      { label: "播放 / 暂停", keys: [["Space"]] },
      { label: "下一步 / 上一步", keys: [["→ / ←"]] },
      { label: "回到开头 / 末尾", keys: [["Home / End"]] },
      { label: "退出演示", keys: [["Esc"]] },
    ] },
    { title: "文字编辑", items: [
      { label: "编辑图形 / 连线文字", keys: [["F2"]] },
      { label: "插入换行", keys: [["Enter"]] },
      { label: "完成文字编辑", keys: [["Ctrl/⌘", "Enter"]] },
      { label: "取消文字修改", keys: [["Esc"]] },
    ] },
    { title: "查找与缩略图", items: [
      { label: "查找框：定位首个结果", keys: [["Enter"]] },
      { label: "查找框：关闭查找", keys: [["Esc"]] },
      { label: "缩略图：平移视口", keys: [["↑ / ↓ / ← / →"]] },
      { label: "缩略图：回到内容中心", keys: [["Enter"], ["Space"]] },
    ] },
    { title: "鼠标与触控板", items: [
      { label: "框选图形", gesture: "在空白处拖动" },
      { label: "增减选中图形", keys: [["Ctrl/⌘", "单击"]] },
      { label: "编辑文字", gesture: "双击图形或连线" },
      { label: "平移画布", gesture: "中键拖动 / 滚轮" },
      { label: "缩放画布", keys: [["Ctrl/⌘", "滚轮"]] },
    ] },
  ],
];
