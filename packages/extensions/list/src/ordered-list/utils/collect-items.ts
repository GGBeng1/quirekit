import type { OrderedListItem } from "./types";

const ORDERED_LIST_ITEM_REGEX = /^(\s*)(\d+)\.\s+(.*)$/;
const INDENTED_LINE_REGEX = /^\s/;

/**
 * Collects ordered list items from raw Markdown lines.
 *
 * @param lines - Source lines to inspect.
 * @returns Parsed ordered items and the number of consumed lines.
 */
export function collectOrderedListItems(
  lines: readonly string[]
): [OrderedListItem[], number] {
  const listItems: OrderedListItem[] = [];
  let currentLineIndex = 0;
  let consumed = 0;

  while (currentLineIndex < lines.length) {
    const line = lines[currentLineIndex] ?? "";
    const match = line.match(ORDERED_LIST_ITEM_REGEX);

    if (!match) {
      break;
    }

    const [, indent = "", number = "1", content = ""] = match;
    const [itemContent, itemLines, nextLineIndex] = collectItemContinuation(
      lines,
      currentLineIndex,
      indent.length,
      content
    );

    listItems.push({
      indent: indent.length,
      number: Number.parseInt(number, 10),
      content: itemContent.trim(),
      raw: itemLines.join("\n")
    });

    consumed = nextLineIndex;
    currentLineIndex = nextLineIndex;
  }

  return [listItems, consumed];
}

/**
 * Collects continuation lines for one ordered list item.
 *
 * @param lines - Markdown source lines.
 * @param currentLineIndex - Index of the item marker line.
 * @param indentLevel - Leading space count before the marker.
 * @param content - Initial line content after the marker.
 * @returns Item content, raw lines, and next line index.
 */
function collectItemContinuation(
  lines: readonly string[],
  currentLineIndex: number,
  indentLevel: number,
  content: string
): [content: string, itemLines: string[], nextLineIndex: number] {
  let itemContent = content;
  let nextLineIndex = currentLineIndex + 1;
  const itemLines = [lines[currentLineIndex] ?? ""];

  while (nextLineIndex < lines.length) {
    const nextLine = lines[nextLineIndex] ?? "";

    if (nextLine.match(ORDERED_LIST_ITEM_REGEX)) {
      break;
    }

    if (nextLine.trim() === "") {
      itemLines.push(nextLine);
      itemContent += "\n";
      nextLineIndex += 1;
      continue;
    }

    if (nextLine.match(INDENTED_LINE_REGEX)) {
      itemLines.push(nextLine);
      itemContent += `\n${nextLine.slice(indentLevel + 2)}`;
      nextLineIndex += 1;
      continue;
    }

    break;
  }

  return [itemContent, itemLines, nextLineIndex];
}
