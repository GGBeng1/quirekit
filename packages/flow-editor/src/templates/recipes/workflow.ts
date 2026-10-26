import { buildRecipe } from "./build";

/** @returns Order fulfillment with payment failure and cancellation paths. */
export function orderRecipe() { return buildRecipe([
  ["order", "document", 260, 0, "创建订单"], ["pay", "decision", 260, 130, "支付成功？", "orange"],
  ["stock", "subprocess", 260, 280, "锁定库存"], ["ship", "process", 260, 410, "拣货与发货"],
  ["done", "terminator", 260, 540, "签收完成", "green"], ["retry", "manual-input", 0, 150, "重新支付", "orange"],
  ["cancel", "terminator", 0, 300, "取消订单", "slate"],
], [["order", "pay"], ["pay", "stock", "是"], ["stock", "ship"], ["ship", "done"], ["pay", "retry", "否", "left", "right"], ["retry", "cancel", "超时"], ["retry", "order", "重试", "top", "left", [{ x: 80, y: 32 }]]]); }

/** @returns Leave request, decision and correction loop. */
export function leaveRecipe() { return buildRecipe([
  ["request", "document", 260, 0, "填写请假申请"], ["manager", "process", 260, 130, "主管审核"],
  ["check", "decision", 260, 260, "批准？", "orange"], ["record", "database", 260, 430, "登记与通知", "green"],
  ["done", "terminator", 260, 600, "申请完成", "green"], ["revise", "manual-input", 0, 280, "补充申请说明", "orange"],
], [["request", "manager"], ["manager", "check"], ["check", "record", "是"], ["record", "done"], ["check", "revise", "否", "left", "right"], ["revise", "request", "重新提交", "top", "left", [{ x: 80, y: 32 }]]]); }

/** @returns Expense review with a concrete missing-evidence return path. */
export function expenseRecipe() { return buildRecipe([
  ["receipts", "multi-document", 260, 0, "整理票据", "purple"], ["submit", "document", 260, 120, "提交报销单"],
  ["audit", "decision", 260, 250, "材料完整？", "orange"], ["finance", "process", 260, 400, "财务复核"],
  ["pay", "data", 260, 530, "安排付款", "green"], ["archive", "stored-data", 260, 660, "归档凭证", "slate"],
  ["more", "manual-input", 0, 270, "补充票据", "orange"],
], [["receipts", "submit"], ["submit", "audit"], ["audit", "finance", "是"], ["finance", "pay"], ["pay", "archive"], ["audit", "more", "否", "left", "right"], ["more", "submit", "补齐", "top", "left", [{ x: 80, y: 150 }]]]); }

/** @returns Incident triage with mitigation and root-cause follow-up. */
export function incidentRecipe() { return buildRecipe([
  ["alert", "terminator", 300, 0, "收到告警", "orange"], ["triage", "decision", 300, 130, "影响线上？", "orange"],
  ["mitigate", "subprocess", 300, 290, "止损与恢复"], ["verify", "process", 300, 420, "验证服务状态", "green"],
  ["record", "document", 40, 290, "记录与排查", "slate"], ["review", "multi-document", 300, 550, "复盘与改进", "purple"],
], [["alert", "triage"], ["triage", "mitigate", "是"], ["triage", "record", "否", "left", "right"], ["mitigate", "verify"], ["verify", "review"], ["record", "review", "结论", "bottom", "left", [{ x: 120, y: 580 }]]]); }

/** @returns Release pipeline with explicit rollback on failed verification. */
export function releaseRecipe() { return buildRecipe([
  ["code", "document", 0, 120, "合并代码"], ["test", "subprocess", 240, 120, "构建与测试"],
  ["deploy", "process", 480, 120, "灰度发布"], ["verify", "decision", 720, 100, "指标正常？", "orange"],
  ["finish", "terminator", 980, 120, "全量上线", "green"], ["rollback", "process", 720, 320, "回滚版本", "orange"],
  ["fix", "manual-operation", 480, 320, "定位与修复", "purple"],
], [["code", "test", "", "right", "left"], ["test", "deploy", "", "right", "left"], ["deploy", "verify", "", "right", "left"], ["verify", "finish", "是", "right", "left"], ["verify", "rollback", "否"], ["rollback", "fix", "", "left", "right"], ["fix", "test", "重新验证", "left", "bottom", [{ x: 320, y: 352 }]]]); }
