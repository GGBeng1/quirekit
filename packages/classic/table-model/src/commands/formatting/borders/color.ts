import type { Node as PMNode } from "@quirekit/pm";
import { wordTableCommandFailure, type SetWordTableCellBorderColorOptions, type WordTableCommandResult } from "../../types";
import { setWordTableCellBorderFormat } from "./format";

/**
 * Recolors existing edges through the shared property-patch command.
 * @param tableNode - Source Word table.
 * @param options - Selection and explicit RGB or automatic color.
 * @returns Atomic result retaining the color command's compatibility failure code.
 */
export function setWordTableCellBorderColor(tableNode: PMNode, options: SetWordTableCellBorderColorOptions): WordTableCommandResult<PMNode> {
  const result = setWordTableCellBorderFormat(tableNode, { ...options, format: { color: options.color } });
  return !result.ok && result.reason === "unsupported-border-format"
    ? wordTableCommandFailure("unsupported-border-color") : result;
}
