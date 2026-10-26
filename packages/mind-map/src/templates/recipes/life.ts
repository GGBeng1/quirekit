import type { MindMapTemplateRecipe } from "../types";
import { palettes as p } from "./palettes";

/** Learning and personal planning starters with complete actionable outlines. */
export const lifeTemplates: readonly MindMapTemplateRecipe[] = [
  { id: "study", category: "life", title: "学习笔记", description: "理解、实践与巩固", root: "学习主题", branches: [
    ["核心概念", ["定义与背景", ["关键原理", ["为什么成立", "适用条件"]]]], ["实践应用", ["整理例子", "动手练习"]],
    ["待解问题", ["记录疑问", "查找资料"]], ["巩固回顾", ["总结要点", "安排复习"]],
  ], design: { palette: p.forest, shape: "rounded", line: "curve", leaves: "plain" } },
  { id: "reading", category: "life", title: "读书摘记", description: "从书中观点到自己的理解", root: "一本好书", layout: "logical-left", branches: [
    ["阅读背景", ["作者与主题", "阅读目的"]], ["核心观点", ["观点一", "观点二", "论证依据"]],
    ["印象片段", ["精彩表达", "关键案例"]], ["我的思考", ["认同与疑问", "关联已有知识"]], ["实际行动", ["尝试应用", "继续阅读"]],
  ], design: { palette: p.amber, shape: "rectangle", line: "elbow", leaves: "plain" } },
  { id: "travel", category: "life", title: "旅行计划", description: "行前准备与沿途期待", root: "下一次旅行", branches: [
    ["目的地", ["想去的地方", "最佳出行时间"]], ["行程", ["第一天 · 抵达", "第二天 · 探索", "第三天 · 漫步"]],
    ["预订", ["交通", "住宿"]], ["行李", ["证件与用品", "天气与衣物"]], ["期待", ["当地美食", "值得记录的瞬间"]],
  ], design: { palette: p.ocean, shape: "rounded", rootShape: "ellipse", line: "curve", leaves: "filled" } },
  { id: "review", category: "life", title: "个人复盘", description: "看见成长，找到调整方向", root: "这一阶段的我", branches: [
    ["做成了什么", ["重要成果", "值得庆祝"]], ["学到了什么", ["新的认识", "有效的方法"]],
    ["遇到了什么", ["困难与原因", "可以求助的资源"]], ["接下来", ["继续保持", "做出改变", "一个小行动"]],
  ], design: { palette: p.violet, shape: "ellipse", line: "curve", leaves: "card" } },
];
