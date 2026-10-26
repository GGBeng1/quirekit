import type { MindMapTemplateRecipe } from "../types";
import { palettes as p } from "./palettes";

/** Work templates differ in task structure as well as visual hierarchy. */
export const workTemplates: readonly MindMapTemplateRecipe[] = [
  { id: "weekly", category: "work", title: "每周计划", description: "工作与生活，一周有序", root: "本周计划", branches: [
    ["本周重点", ["确定三个优先目标", "明确完成标准"]], ["周一至周三", [["专注工作", ["推进核心任务", "预留深度时间"]], "同步协作进度"]],
    ["周四至周五", ["完成交付", "检查遗漏"]], ["个人成长", ["阅读与学习", "运动与休息"]], ["周末复盘", ["本周收获", "下周调整"]],
  ], design: { palette: p.ocean, shape: "rounded", line: "elbow", leaves: "plain" } },
  { id: "project", category: "work", title: "项目推进", description: "目标 → 执行 → 复盘", root: "项目推进", layout: "logical-right", branches: [
    ["明确目标", ["收集用户需求", "确定验收标准"]], ["协作执行", ["分配任务", "每周同步进度"]], ["复盘改进", ["记录经验", "安排下一步"]],
  ], design: { palette: p.ocean, shape: "rectangle", line: "elbow", leaves: "card" } },
  { id: "meeting", category: "work", title: "会议记录", description: "记下共识，落实行动", root: "会议记录", layout: "logical-right", branches: [
    ["讨论议题", ["背景资料", "待解决问题"]], ["主要结论", ["达成共识", "保留分歧"]],
    ["后续行动", [["任务清单", ["负责人", "完成时间"]], "验收方式"]], ["下次跟进", ["检查结果", "待讨论事项"]],
  ], design: { palette: p.slate, shape: "rounded", line: "direct", leaves: "plain" } },
  { id: "product", category: "work", title: "产品规划", description: "连接用户、能力与价值", root: "产品蓝图", branches: [
    ["用户", ["目标人群", "核心场景"]], ["问题", ["现有痛点", "替代方案"]], ["价值", ["核心承诺", "差异优势"]],
    ["能力", [["核心功能", ["必须具备", "可以延后"]], "体验原则"]], ["交付", ["里程碑", "验证指标"]],
  ], design: { palette: p.blue, shape: "rounded", line: "curve", leaves: "card" } },
  { id: "event", category: "work", title: "活动策划", description: "从创意到现场执行", root: "活动策划", branches: [
    ["活动定位", ["目标受众", "主题与亮点"]], ["内容设计", ["议程安排", "互动环节", "嘉宾邀请"]],
    ["传播计划", ["预热内容", "报名渠道"]], ["现场准备", ["场地物料", "人员分工", "应急预案"]], ["效果回顾", ["参与反馈", "成果记录"]],
  ], design: { palette: p.coral, shape: "rounded", line: "curve", leaves: "filled" } },
  { id: "goals", category: "work", title: "目标拆解", description: "大目标落到下一步行动", root: "季度目标", layout: "logical-right", branches: [
    ["关键成果一", [["行动计划", ["第一步", "第二步"]], "衡量指标"]], ["关键成果二", [["行动计划", ["准备资源", "推进实施"]], "验收时间"]],
    ["执行保障", ["每周检查", "风险与对策", "阶段复盘"]],
  ], design: { palette: p.forest, shape: "rectangle", line: "elbow", leaves: "plain" } },
];
