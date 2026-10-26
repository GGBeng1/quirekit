import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { MdBlockInsertionSearchItem } from "./types";

// Stable aliases supplement localized labels; serialization and capability
// availability still come exclusively from the shared insertion catalog.
const aliases: Readonly<Record<string, string>> = {
  "insert-paragraph": "paragraph text zw zhengwen", "insert-table": "table bg biaoge",
  "insert-code": "code codeblock dmk daimakuai", "insert-quote": "quote blockquote yy yinyong",
  "insert-divider": "divider horizontal rule fgx fengexian", "insert-list": "bullet list xmlb",
  "insert-ordered": "ordered numbered list bhlb", "insert-task": "task todo checklist rwqd",
  "insert-note": "note info tsk", "insert-warning": "warning alert jgk",
  "insert-details": "details collapse zdk", "insert-highlight": "highlight callout emoji glk gaoliangkuai", "insert-nested": "nested container qtrq",
  "insert-definition": "definition list dylb", image: "image picture tp tupian", link: "link lj lianjie",
  inlineMath: "inline math formula hngs", displayMath: "display math formula kjgs",
  textDiagram: "plantuml puml dot graphviz mermaid text diagram wbhuitu sequence sxt shixutu mindmap swdt",
  flowchart: "flowchart diagram editor lct liuchengtu txbjq", mindMap: "mindmap mind map editor swdt siweidaotu swdtbjq", whiteboard: "whiteboard bb baiban",
  footnote: "footnote jz jiaozhu", date: "date rq riqi", emoji: "emoji bq biaoqing", mention: "mention tj tiji",
};

/** @param catalog - Installed shared menu, built only while open. @param query - Current bounded source query. @returns Ordered searchable actions retaining their existing groups and identities. */
export function searchBlockInsertions(catalog: readonly QuireKitMenuEntry[], query: string): readonly MdBlockInsertionSearchItem[] {
  const needle = query.trim().toLocaleLowerCase();
  return catalog.flatMap(group => (group.children ?? []).filter(item => {
    if (item.disabled) return false;
    const heading = /^insert-h[1-6]$/u.test(item.value) ? `heading title bt biaoti h${item.value.slice(-1)}` : "";
    return `${item.label} ${item.value} ${aliases[item.value] ?? ""} ${heading}`.toLocaleLowerCase().includes(needle);
  }).map(item => ({ key: item.value, label: item.label, group: group.label, icon: item.icon })));
}
