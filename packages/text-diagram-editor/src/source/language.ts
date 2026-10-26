import { StreamLanguage, type StringStream } from "@quirekit/cm-language";
import type { TextDiagramLanguage } from "@quirekit/text-diagram";
import type { DiagramTokenState } from "./types";

const keywords: Record<TextDiagramLanguage, ReadonlySet<string>> = {
  mermaid: new Set("graph flowchart sequencediagram classdiagram statediagram statediagram-v2 erdiagram gantt pie journey gitgraph mindmap timeline quadrantchart sankey-beta xychart-beta block-beta architecture-beta packet-beta kanban requirementdiagram participant actor autonumber activate deactivate note over left right of loop alt else opt par and end critical break rect link links subgraph direction title section dateformat axisformat excludes class classdef style linkstyle click accdescr acctitle state as fork join choice commit branch checkout merge cherry-pick options callback call return autonumber tb td bt lr rl".split(" ")),
  plantuml: new Set("participant actor boundary control entity database collections queue class abstract interface enum annotation object component node artifact folder frame cloud storage rectangle package namespace usecase state as together left right top bottom of over note end legend title caption header footer skinparam hide show remove activate deactivate return alt else opt loop par break critical group ref newpage box autonumber start stop if then endif elseif while endwhile repeat backward switch case endswitch fork again detach kill split endfork endsplit partition allowmixing scale true false null".split(" ")),
  dot: new Set("strict graph digraph subgraph node edge rankdir rank label xlabel headlabel taillabel shape style color fillcolor fontcolor fontname fontsize penwidth width height margin pad nodesep ranksep compound splines constraint weight minlen arrowhead arrowtail arrowsize dir true false".split(" ")),
};

/** @param stream - Current source line. @param state - Copyable parser state. @returns String token, retaining multiline quotes when needed. */
function stringToken(stream: StringStream, state: DiagramTokenState): string {
  while (!stream.eol()) {
    const character = stream.next();
    if (character === "\\") stream.next();
    else if (character === state.quote) { state.quote = null; break; }
  }
  return "string";
}

/** @param stream - Current source line. @param state - Copyable parser state. @returns Comment token, including its closing delimiter. */
function commentToken(stream: StringStream, state: DiagramTokenState): string {
  const end = stream.string.indexOf(state.commentEnd!, stream.pos);
  if (end < 0) stream.skipToEnd();
  else { stream.pos = end + state.commentEnd!.length; state.commentEnd = null; }
  return "comment";
}

/**
 * Colors common diagram lexemes without claiming to validate the engine grammar.
 * @param language - Active diagram dialect.
 * @returns Incremental CodeMirror stream language with bounded line tokenization.
 */
function defineDiagramLanguage(language: TextDiagramLanguage): StreamLanguage<DiagramTokenState> {
  return StreamLanguage.define<DiagramTokenState>({
    name: language,
    /** @returns Independent lexical state for one parse. */
    startState: () => ({ commentEnd: null, quote: null, indents: [] }),
    /** @param stream - Current line. @param state - Retained lexical context. @returns Styling tag or unclassified text. */
    token(stream, state) {
      if (state.commentEnd) return commentToken(stream, state);
      if (state.quote) return stringToken(stream, state);
      if (stream.eatSpace()) return null;
      if (language === "plantuml" && stream.match("/'")) { state.commentEnd = "'/"; return commentToken(stream, state); }
      if (language === "dot" && stream.match("/*")) { state.commentEnd = "*/"; return commentToken(stream, state); }
      if (language === "mermaid" && stream.match("%%") || language === "plantuml" && stream.match("'")
        || language === "dot" && (stream.match("//") || stream.match(/^#(?=\s|\d)/u))) { stream.skipToEnd(); return "comment"; }
      if (stream.match(/^["`]/u)) { state.quote = stream.current(); return stringToken(stream, state); }
      if (language === "plantuml" && stream.match(/^[@!][\w]+/u)) return "keyword";
      if (stream.match(/^#[\da-fA-F]{3,8}\b/u) || stream.match(/^\d+(?:\.\d+)?\b/u)) return "number";
      if (stream.match(/^[\p{L}_$][\p{L}\p{N}_$]*(?:[.-][\p{L}\p{N}_$]+)*/u)) return keywords[language].has(stream.current().toLowerCase()) ? "keyword" : "variableName";
      // Track only bracket structure; DSL-specific blocks still inherit their line's indentation.
      const character = stream.next()!;
      if (/[{[(]/u.test(character)) { state.indents.push(stream.indentation() + stream.indentUnit); return "bracket"; }
      if (/[}\])]/u.test(character)) { state.indents.pop(); return "bracket"; }
      if (/[<>:=|&+*~\-/]/u.test(character)) { stream.eatWhile(/[<>:=|&+*~\-/]/u); return "operator"; }
      return "punctuation";
    },
    /** @param state - Context preceding the new line. @param textAfter - Text after the cursor. @returns Bracket indentation or the editor's normal line inheritance. */
    indent(state, textAfter) {
      if (state.commentEnd || state.quote || !state.indents.length) return null;
      return /^\s*[}\])]/u.test(textAfter) ? state.indents.at(-2) ?? 0 : state.indents.at(-1)!;
    },
    languageData: { commentTokens: language === "dot" ? { line: "//", block: { open: "/*", close: "*/" } } : { line: language === "mermaid" ? "%%" : "'" } },
  });
}

/** Shared immutable language definitions; each EditorState owns its parse state. */
export const diagramSourceLanguages = {
  mermaid: defineDiagramLanguage("mermaid"), plantuml: defineDiagramLanguage("plantuml"), dot: defineDiagramLanguage("dot"),
};
