import type { MindMapTemplateRecipe } from "../types";
import { palettes as p } from "./palettes";

/** Original analysis frameworks, using only admitted tree and styling semantics. */
export const analysisTemplates: readonly MindMapTemplateRecipe[] = [
  { id: "decision", category: "analysis", title: "方案比较", description: "比较价值、成本与风险", root: "待定方案", layout: "logical-left", branches: [
    ["决策标准", ["必须满足", "可以取舍"]], ["方案一", ["优势", "代价", "主要风险"]],
    ["方案二", ["优势", "代价", "主要风险"]], ["行动计划", ["补充证据", "小范围验证"]],
  ], design: { palette: p.amber, shape: "rounded", rootShape: "diamond", line: "direct", leaves: "card" } },
  { id: "swot", category: "analysis", title: "SWOT 分析", description: "优势、劣势、机会、威胁", root: "战略分析", branches: [
    ["S · 优势", ["独特能力", "现有资源", "已验证的积累"]], ["W · 劣势", ["能力缺口", "资源限制"]],
    ["O · 机会", ["外部变化", "未满足的需要", "合作可能"]], ["T · 威胁", ["竞争压力", "环境风险"]],
  ], design: { palette: p.spectrum, shape: "rectangle", line: "direct", leaves: "filled" } },
  { id: "marketing", category: "analysis", title: "4P 营销", description: "产品、价格、渠道、推广", root: "营销组合", branches: [
    ["产品 · Product", ["用户价值", "核心卖点", "服务体验"]], ["价格 · Price", ["定价依据", "成本与利润"]],
    ["渠道 · Place", ["触达路径", "交付方式"]], ["推广 · Promotion", ["沟通信息", "内容与活动", "效果指标"]],
  ], design: { palette: p.coral, shape: "rectangle", rootShape: "diamond", line: "direct", leaves: "plain" } },
  { id: "research", category: "analysis", title: "问题研究", description: "从提问到证据与结论", root: "研究问题", layout: "logical-right", branches: [
    ["问题界定", ["研究范围", "已知事实"]], ["提出假设", ["假设一", "假设二"]],
    ["收集证据", [["方法", ["访谈", "资料与数据"]], "证据可靠性"]], ["形成判断", ["支持与反例", "结论边界"]], ["下一步", ["验证行动", "新的问题"]],
  ], design: { palette: p.violet, shape: "rounded", line: "elbow", leaves: "card" } },
];
