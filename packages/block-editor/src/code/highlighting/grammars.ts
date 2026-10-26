import type { Parser } from "@lezer/common";
import { parser as javascript } from "@lezer/javascript";
import { parser as json } from "@lezer/json";
import { parser as css } from "@lezer/css";
import { parser as html } from "@lezer/html";
import { parser as python } from "@lezer/python";
import { parser as markdown } from "@quirekit/lezer-markdown";
import { StreamLanguage } from "@quirekit/cm-language";
import { shell } from "@quirekit/cm-legacy-modes/mode/shell";
import { standardSQL } from "@quirekit/cm-legacy-modes/mode/sql";

const typescript = javascript.configure({ dialect: "ts" });
const bash = StreamLanguage.define(shell).parser, sql = StreamLanguage.define(standardSQL).parser;
/** Installed parsers only; unsupported imported names retain readable source. */
export const codeGrammars: Readonly<Record<string, Parser>> = {
  javascript, js: javascript, typescript, ts: typescript, json, css, html,
  python, py: python, markdown, md: markdown, bash, shell: bash, sh: bash, sql
};
