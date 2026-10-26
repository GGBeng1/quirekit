import { insertSourceBlock, insertAtSourceBlankLine, replaceSourceBlock, type MsfeCommand } from "@quirekit/msfe-core";
import type { MdBlockInsertionTarget } from "./types";

/** @param target - Captured block or blank line. @param source - Canonical feature payload. @returns The shared revision-guarded insertion planner. */
export function blockInsertionCommand(target: MdBlockInsertionTarget, source: string): MsfeCommand {
  if (target.side === "at") return insertAtSourceBlankLine(target.controls.line, source);
  return target.side === "replace" ? replaceSourceBlock(target.controls.block, source) : insertSourceBlock(target.controls.block, target.side, source);
}
