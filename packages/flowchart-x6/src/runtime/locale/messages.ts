/** Adapter-owned native controls and defaults; no framework or UI dependency. */
const english: Readonly<Record<string, string>> = {
  "待处理": "Pending", "处理中": "Running", "完成": "Completed", "复用": "Reused", "失效": "Invalidated",
  "流程图编辑区": "Diagram editor", "图形文字": "Shape text", "连线文字": "Connector text", "拖动旋转图形": "Drag to rotate shape",
  "缩略图定位画布，方向键平移，回车居中": "Navigate overview; arrow keys pan, Enter centers",
  "未命名图形": "Untitled shape", "新图形": "New shape", "分层容器": "Layer container", "职责泳道": "Responsibility lane",
  "用户": "User", "新参与者": "New participant", "新泳道": "New lane", "请求": "Request", "返回结果": "Response",
  "异步通知": "Async notification", "内部处理": "Internal call", "[条件成立]": "[condition]", "[否则]": "[else]", "[重复条件]": "[repeat condition]",
};
/** @param locale - Host language. @returns Supported adapter language. */
export function resolveFlowRuntimeLocale(locale = "zh-CN"): string { return /^en(?:-|$)/i.test(locale) ? "en" : "zh-CN"; }
/** @param locale - Instance language. @param source - Native label or newly generated default. @returns Display text, without translating existing user content. */
export function flowRuntimeText(locale: string, source: string): string {
  if (resolveFlowRuntimeLocale(locale) !== "en") return source;
  const phase = /^阶段 (\d+)$/.exec(source);
  return phase ? `Phase ${phase[1]}` : english[source] ?? source;
}
