import type { MindMapTemplateRecipe } from "../types";
import { palettes as p } from "./palettes";

/** Reusable visual starting points with editable original content. */
export const styleTemplates: readonly MindMapTemplateRecipe[] = [
  { id: "blank", category: "style", title: "空白脑图", description: "留白起笔，自由展开", root: "中心主题", branches: [],
    design: { palette: p.blue, shape: "rounded", line: "curve", leaves: "card" } },
  { id: "classic", category: "style", title: "经典蓝", description: "双向展开 · 清晰层级", root: "中心主题", branches: [
    ["发现问题", ["现状", "机会"]], ["收集想法", ["灵感", "资料"]], ["明确目标", ["方向", "标准"]],
    ["选择路径", ["方案", "资源"]], ["采取行动", ["任务", "进度"]], ["回顾总结", ["收获", "改进"]],
  ], design: { palette: p.blue, shape: "rounded", line: "curve", leaves: "plain" } },
  { id: "minimal", category: "style", title: "简洁墨线", description: "黑白线框 · 专注内容", root: "思考主题", branches: [
    ["是什么", ["定义", "特征"]], ["为什么", ["原因", "价值"]], ["怎么做", ["方法", "步骤"]], ["如何验证", ["证据", "结论"]],
  ], design: { palette: p.ink, shape: "rectangle", line: "direct", leaves: "plain" } },
  { id: "coral", category: "style", title: "珊瑚灵感", description: "柔和色彩 · 单向生长", root: "一个好想法", layout: "logical-right", branches: [
    ["观察", ["看见什么", "感受到什么", "记录细节"]], ["联想", ["换个角度", "试着组合"]], ["表达", ["一句话描述", "一个小实验", "分享反馈"]],
  ], design: { palette: p.coral, shape: "rounded", rootShape: "ellipse", line: "curve", leaves: "filled" } },
  { id: "ocean", category: "style", title: "海洋气泡", description: "圆润节点 · 双向发散", root: "灵感之海", branches: [
    ["探索", ["发现", "提问"]], ["连接", ["联系", "组合"]], ["创造", ["尝试", "迭代"]], ["分享", ["讲述", "交流"]],
  ], design: { palette: p.ocean, shape: "ellipse", line: "curve", leaves: "filled" } },
  { id: "business", category: "style", title: "商务蓝灰", description: "向左梳理 · 方正折线", root: "行动方案", layout: "logical-left", branches: [
    ["目标", ["预期成果", "衡量指标"]], ["策略", ["关键路径", "优先顺序"]], ["执行", ["责任分工", "时间节点"]], ["保障", ["所需资源", "风险预案"]],
  ], design: { palette: p.slate, shape: "rectangle", line: "elbow", leaves: "card" } },
];
