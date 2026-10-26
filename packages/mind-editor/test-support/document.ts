import { readMindMapDocument, type MindMapNode } from "@quirekit/mind-map";

/** @param id - Stable identity. @param text - Visible topic. @param children - Ordered branches. @returns Canonical plain-text node. */
function node(id: string, text: string, children: readonly MindMapNode[] = []): MindMapNode {
  return { id, text, collapsed: false, children };
}
export const initialDocument = readMindMapDocument({ version: 1, revision: 0, layout: "mind-map",
  root: node("root", "时间管理", [
    node("week", "本周计划", [node("priority", "确定三个优先目标"), node("focus", "安排专注工作时间"), node("review", "周五检查完成情况")]),
    node("next", "下周安排", [node("prepare", "提前准备重要会议"), node("buffer", "预留弹性时间")]),
    node("summary", "周工作总结", [node("done", "记录已完成的事项"), node("learn", "总结经验与改进")]),
    node("personal", "个人成长", [node("read", "每天阅读 30 分钟"), node("exercise", "保持运动与休息")]),
  ]) });
