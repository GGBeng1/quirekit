import { buildRecipe } from "./build";

/** @returns Data validation and quarantine before analytics. */
export function cleaningRecipe() { return buildRecipe([
  ["source", "database", 0, 100, "原始数据", "purple"], ["clean", "subprocess", 240, 120, "去重与标准化"],
  ["quality", "decision", 480, 100, "质量达标？", "orange"], ["warehouse", "database", 760, 100, "分析数据仓库", "green"],
  ["quarantine", "stored-data", 480, 320, "隔离异常记录", "orange"], ["report", "document", 760, 320, "质量报告", "slate"],
], [["source", "clean", "", "right", "left"], ["clean", "quality", "", "right", "left"], ["quality", "warehouse", "是", "right", "left"], ["quality", "quarantine", "否"], ["quarantine", "report", "", "right", "left"], ["warehouse", "report"]]); }

/** @returns Backup creation and a separately visible restore rehearsal. */
export function backupRecipe() { return buildRecipe([
  ["production", "database", 0, 0, "业务数据库"], ["snapshot", "subprocess", 260, 18, "生成快照"],
  ["store", "stored-data", 520, 18, "加密备份存储", "purple"], ["restore", "process", 520, 200, "恢复演练"],
  ["validate", "decision", 260, 180, "校验一致？", "orange"], ["report", "document", 0, 200, "记录演练结果", "green"],
], [["production", "snapshot", "", "right", "left"], ["snapshot", "store", "", "right", "left"], ["store", "restore"], ["restore", "validate", "", "left", "right"], ["validate", "report", "通过", "left", "right"], ["validate", "snapshot", "重新备份", "top", "bottom"]]); }
