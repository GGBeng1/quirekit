import { codeGrammars } from "./highlighting/grammars";
/** Shared language labels for the header and contextual block menu. */
const names: Readonly<Record<string, string>> = { "": "纯文本", javascript: "JavaScript", typescript: "TypeScript", json: "JSON", css: "CSS", html: "HTML", bash: "Shell", python: "Python", sql: "SQL", markdown: "Markdown" };
/** @param current - Imported language, retained even outside the built-in choices. @returns Public language options. */
export function blockCodeLanguages(current: string) {
  return [...new Set([...Object.keys(names), current])].map(language => ({ value: `language:${language}`,
    label: names[language] ?? `${language}${codeGrammars[language.toLowerCase()] ? "" : "（纯文本显示）"}` }));
}
