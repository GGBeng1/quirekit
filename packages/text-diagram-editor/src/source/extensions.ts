import { defaultKeymap, history, historyKeymap, indentWithTab } from "@quirekit/cm-commands";
import { bracketMatching, indentUnit } from "@quirekit/cm-language";
import { search, searchKeymap } from "@quirekit/cm-search";
import { Annotation, EditorState, Facet, StateEffect, type Extension } from "@quirekit/cm-state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from "@quirekit/cm-view";
import { diagramSourceTheme } from "./theme";
import type { DiagramSourceValue } from "./types";

/** Distinguishes controlled replacements from local input without disabling history. */
export const externalSource = Annotation.define<boolean>();
/** Rejected edits report feedback without changing either the source or selection. */
export const sourceLimitExceeded = StateEffect.define<boolean>();
/** Output convention is separate from CM input parsing, which accepts LF, CRLF and CR. */
export const sourceLineBreak = Facet.define<string, string>({ combine: values => values[0] ?? "\n" });

/** Standard source editing capabilities shared by all three diagram grammars. */
export const diagramSourceExtensions: Extension = [
  lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), highlightSpecialChars(), drawSelection(),
  bracketMatching(), indentUnit.of("  "), EditorState.tabSize.of(2), EditorView.lineWrapping,
  history({ minDepth: 50 }), search({ top: true }),
  keymap.of([...searchKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]), diagramSourceTheme,
  EditorState.transactionFilter.of(transaction => {
    if (!transaction.docChanged) return transaction;
    if (transaction.startState.readOnly && !transaction.annotation(externalSource)) return [];
    // CM stores each line break as one position; enforce the serialized UTF-16 budget too.
    const document = transaction.newDoc;
    const length = document.length + (document.lines - 1) * (transaction.startState.facet(sourceLineBreak).length - 1);
    return length <= 30_000 ? transaction : { effects: sourceLimitExceeded.of(true) };
  }),
];

/** @param value - Current UI state. @returns Non-document configuration; never recreates source or history. */
export function diagramSourceConfiguration(value: DiagramSourceValue): Extension {
  return [EditorState.readOnly.of(value.disabled), EditorView.editable.of(!value.disabled),
    EditorView.contentAttributes.of({ "aria-label": value.label, "aria-multiline": "true", "aria-readonly": String(value.disabled), "aria-invalid": String(value.invalid === true),
      ...(value.id ? { id: value.id } : {}), ...(value.describedBy ? { "aria-describedby": value.describedBy } : {}),
      spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
    EditorState.phrases.of(/^en(?:-|$)/iu.test(value.locale ?? "") ? {} : {
      Find: "查找", Replace: "替换", next: "下一处", previous: "上一处", all: "全选匹配", "match case": "区分大小写",
      regexp: "正则表达式", "by word": "全词匹配", replace: "替换", "replace all": "全部替换", close: "关闭查找",
      "No matches": "无匹配项", "$ matches": "$ 处匹配", "current match": "当前匹配",
    }),
  ];
}
