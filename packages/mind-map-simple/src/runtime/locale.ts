/** @param locale - Requested interface language. @returns Fixed-size labels for one renderer instance. */
export function mindMapRuntimeMessages(locale = "zh-CN") {
  return /^en(?:-|$)/iu.test(locale.trim()) ? {
    canvas: "Mind map canvas", branch: "Branch topic", child: "Subtopic", parent: "Parent topic", floating: "Floating topic",
    invalidDrop: "Cannot attach a topic to itself or its descendants", detach: "Release to create a floating topic",
    attach: "Release to attach to “{topic}”",
  } : {
    canvas: "思维导图编辑区", branch: "分支主题", child: "子主题", parent: "父主题", floating: "自由主题",
    invalidDrop: "不能挂接到自身或子主题", detach: "松开成为自由主题", attach: "松开挂接到「{topic}」",
  };
}
