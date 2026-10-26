import type { MindMapTextDiagnostic, MindMapTextFormat, TextTopic } from "./types";

/** @param text - Literal input. @returns Indentation depth, rejecting mixed or partial units. */
function indentation(text: string): number {
  if (text.includes("\t") && text.includes(" ") || !text.includes("\t") && text.length % 2) throw new TypeError("outline: use two spaces or one Tab per level");
  const depth = text.includes("\t") ? text.length : text.length / 2;
  if (depth > 64) throw new RangeError("outline: depth limit exceeded");
  return depth;
}
/** @param text - Markdown topic. @returns Literal punctuation, without interpreting links or HTML. */
function literal(text: string): string { return text.replace(/\\([\\`*_{}\[\]()#+.!<>-])/gu, "$1"); }

/** @param source - Bounded input. @param format - Chosen grammar. @param diagnostics - Owned loss ledger.
 * @returns Ordered top-level trees before canonical validation. */
export function parseTextTopics(source: string, format: MindMapTextFormat, diagnostics: MindMapTextDiagnostic[]): TextTopic[] {
  if (source.length > 4000000 || source.split("\n").length > 50000) throw new RangeError("outline: input budget exceeded");
  let text = source.replace(/\r\n?/gu, "\n").replace(/^\uFEFF/u, "");
  const fenced = /^\s*(`{3,}|~{3,})(?:markdown|mindmap|xmind|text)?[^\S\n]*\n([\s\S]*?)\n\1\s*$/iu.exec(text);
  if (fenced) text = fenced[2]!;
  else if (/^\s*(?:`{3,}|~{3,})/u.test(text)) throw new TypeError("outline: invalid or unsupported code fence");
  const roots: TextTopic[] = [], headings: { level: number; node: TextTopic }[] = [], list: TextTopic[] = [];
  let count = 0, previous: TextTopic | undefined, previousDepth = -1;
  /** @param value - Literal label. @returns One parser-local topic. */
  function topic(value: string): TextTopic {
    if (++count > 10000) throw new RangeError("outline: topic budget exceeded");
    return { id: `text-${count}`, text: value, collapsed: false, children: [] };
  }
  // Heading ownership and list indentation are separate stacks. A new heading
  // ends list ownership; content never creates a child beneath an absent level.
  text.split("\n").forEach((line, index) => {
    if (!line.trim()) return;
    const heading = format === "markdown" ? /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?$/u.exec(line) : null;
    if (heading) {
      const level = heading[1]!.length, node = topic(literal(heading[2]!));
      while (headings.length && headings.at(-1)!.level >= level) headings.pop();
      (headings.at(-1)?.node.children ?? roots).push(node); headings.push({ level, node });
      list.length = 0; previous = undefined; previousDepth = -1; return;
    }
    const item = format === "markdown" ? /^([ \t]*)(?:[-+*]|\d+[.)])[ \t]+(.*)$/u.exec(line) : /^([ \t]*)(.*)$/u.exec(line);
    if (!item) {
      const prefix = /^[ \t]*/u.exec(line)![0], depth = indentation(prefix);
      if (previous && depth > previousDepth) { previous.text += `\n${literal(line.slice(prefix.length).replace(/ {2}$/u, ""))}`; return; }
      const node = topic(literal(line)); (headings.at(-1)?.node.children ?? roots).push(node);
      if (diagnostics.length < 1000) diagnostics.push({ code: "fallback", path: `lines[${index + 1}]`, message: "Paragraph retained as a literal topic; inline formatting is not interpreted." });
      list.length = 0; previous = undefined; return;
    }
    const depth = indentation(item[1]!);
    if (depth > list.length) throw new TypeError(`lines[${index + 1}]: indentation skips a parent level`);
    const node = topic(format === "markdown" ? literal(item[2]!.replace(/ {2}$/u, "")) : item[2]!);
    (depth ? list[depth - 1]!.children : headings.at(-1)?.node.children ?? roots).push(node);
    list[depth] = node; list.length = depth + 1; previous = node; previousDepth = depth;
  });
  if (!roots.length) throw new TypeError("outline: no topics");
  return roots;
}
