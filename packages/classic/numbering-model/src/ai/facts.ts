import type { QuireAiCapability } from "@quirekit/ai-contract";
import type { Node } from "@quirekit/pm";
import { resolveWordNumberingRegistry } from "../model/registry";
import { resolveWordNumberingLevel } from "../resolver/markers";
import { applyWordListAiStart, applyWordListAiStyle } from "./apply";
import { resolveWordListAiStarts } from "./starts";
import { readWordListAiStyle, wordListAiStyles } from "./styles";

/** List membership as shown in the AI view. */
interface ListValue {
  /** Marker family. */
  readonly kind: "bullet" | "number" | "task";
  /** Zero-based list level. */
  readonly level: number;
  /** Marker pattern of the level, when it is one of the named patterns. */
  readonly style?: string;
  /** Number the item shows, where the view shows it. */
  readonly start?: number;
  /** Whether a task item is done. */
  readonly checked?: boolean;
}

/**
 * Reads the list membership of one paragraph.
 * @param node - Paragraph node.
 * @param doc - Document root holding the numbering registry.
 * @param pos - Position before the paragraph, when known; the shown number needs it.
 * @returns List membership, or undefined outside a list.
 */
function readList(node: Node, doc: Node, pos?: number): ListValue | undefined {
  const numbering = node.attrs.wordNumbering as { numId?: unknown; level?: unknown; task?: { checked?: unknown } | null } | null | undefined;
  if (typeof numbering?.numId !== "string" || numbering.numId === "0") return undefined;
  const level = typeof numbering.level === "number" ? numbering.level : 0;
  const resolved = resolveWordNumberingLevel(resolveWordNumberingRegistry(doc.attrs.wordNumberingRegistry), numbering.numId, level);
  const style = resolved === undefined ? undefined : readWordListAiStyle(resolved.level);
  if (numbering.task != null) return { kind: "task", level, checked: numbering.task.checked === true };
  const start = pos === undefined ? undefined : resolveWordListAiStarts(doc).get(pos);
  return {
    kind: resolved?.level.format === "bullet" ? "bullet" : "number", level,
    ...(style === undefined ? {} : { style }),
    ...(start === undefined ? {} : { start })
  };
}

/**
 * Writes list membership for people.
 * @param value - List value as read.
 * @returns Text such as "编号“一、”，第 1 级，从 3 开始".
 */
function presentList(value: unknown): string {
  const list = value as ListValue;
  if (list.kind === "task") return `任务${list.checked === true ? "（已完成）" : "（未完成）"}，第 ${(list.level ?? 0) + 1} 级`;
  const style = list.style === undefined ? "" : `“${list.style}”`;
  const start = list.start === undefined ? "" : `，从 ${list.start} 开始`;
  return `${list.kind === "bullet" ? "项目符号" : "编号"}${style}，第 ${(list.level ?? 0) + 1} 级${start}`;
}

/** Paragraph list membership exposed by Word numbering. */
export const wordNumberingAiCapabilities: readonly QuireAiCapability[] = [{
  kind: "format",
  name: "list",
  level: "paragraph",
  numbered: true,
  present: { label: "列表", value: presentList },
  description: "List membership: {kind:\"bullet\"|\"number\"|\"task\", level:0-8, style, start, checked}; consecutive blocks form one list. "
    + "`style` is the marker pattern of the item's level, named by its first marker, and changes that level of the whole list. "
    + "`start` is the number the item shows, given at the start of each list and wherever numbering does not simply go on; "
    + "set it to restart numbering there, or to the next number of an earlier list to continue that list. "
    + "A task item is a checklist line with a check box; `checked` marks it done.",
  schema: {
    type: "object",
    properties: {
      kind: { enum: ["bullet", "number", "task"] },
      level: { type: "integer", minimum: 0, maximum: 8 },
      style: { enum: Object.keys(wordListAiStyles) },
      start: { type: "integer", minimum: 1, maximum: 32767 },
      checked: { type: "boolean" }
    },
    required: ["kind"],
    additionalProperties: false,
    examples: [{ kind: "number", style: "一、" }, { kind: "number", start: 3 }, { kind: "task", checked: true }]
  },
  read: target => target.level === "paragraph" ? readList(target.node, target.doc, target.pos) : undefined,
  apply: ({ tr, commands, from, to }, value) => {
    const current = readList(tr.doc.resolve(from).parent, tr.doc);
    if (value === null) return current === undefined || commands.clearWordList();
    const target = value as ListValue;
    if (target.style !== undefined && wordListAiStyles[target.style]?.kind !== target.kind) return false;
    if (target.checked !== undefined && target.kind !== "task") return false;
    // Toggling the selection as a whole keeps the paragraphs in one list instance.
    if (current?.kind !== target.kind) {
      const toggled = target.kind === "bullet" ? commands.toggleWordBulletList()
        : target.kind === "task" ? commands.toggleWordTaskList() : commands.toggleWordOrderedList();
      if (!toggled) return false;
    }
    let level = readList(tr.doc.resolve(from).parent, tr.doc)?.level ?? 0;
    for (; level < (target.level ?? level); level += 1) if (!commands.increaseWordListLevel()) return false;
    for (; level > (target.level ?? level); level -= 1) if (!commands.decreaseWordListLevel()) return false;
    if (target.style !== undefined && !applyWordListAiStyle(tr, commands, from, to, target.style)) return false;
    if (target.kind === "task") {
      // The command changes every task item in the range and reports false when all of them already match.
      return target.checked === undefined || commands.setWordTaskChecked({ checked: target.checked })
        || readList(tr.doc.resolve(from).parent, tr.doc)?.checked === target.checked;
    }
    return target.start === undefined || target.kind === "bullet" || applyWordListAiStart(tr, commands, from, to, target.start);
  }
}];
