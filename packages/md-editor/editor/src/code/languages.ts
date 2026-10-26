import { LanguageSupport, StreamLanguage, type StreamParser } from "@quirekit/cm-language";
import type { MdCodeLanguage } from "./types";

/**
 * @param load - Lazy import of one legacy stream mode.
 * @returns Loader wrapping the mode as a language for the code block highlighter.
 */
function legacy(load: () => Promise<StreamParser<unknown>>): MdCodeLanguage["load"] {
  return () => load().then(mode => new LanguageSupport(StreamLanguage.define(mode)));
}

/**
 * Product languages, ordered as the code block picker lists them. Each loads only when a
 * matching fence is parsed; hosts may replace this catalog.
 */
export const mdCodeLanguages: readonly MdCodeLanguage[] = [
  { name: "typescript", label: "TypeScript", aliases: ["ts"], load: () => import("@quirekit/cm-lang-javascript").then(module => module.javascript({ typescript: true })) },
  { name: "javascript", label: "JavaScript", aliases: ["js", "jsx"], load: () => import("@quirekit/cm-lang-javascript").then(module => module.javascript({ jsx: true })) },
  { name: "tsx", label: "TSX", load: () => import("@quirekit/cm-lang-javascript").then(module => module.javascript({ typescript: true, jsx: true })) },
  { name: "python", label: "Python", aliases: ["py"], load: () => import("@quirekit/cm-lang-python").then(module => module.python()) },
  { name: "java", label: "Java", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.java)) },
  { name: "go", label: "Go", aliases: ["golang"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/go").then(module => module.go)) },
  { name: "c", label: "C", aliases: ["h"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.c)) },
  { name: "cpp", label: "C++", aliases: ["c++", "cc", "hpp"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.cpp)) },
  { name: "csharp", label: "C#", aliases: ["cs", "c#"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.csharp)) },
  { name: "rust", label: "Rust", aliases: ["rs"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/rust").then(module => module.rust)) },
  { name: "kotlin", label: "Kotlin", aliases: ["kt"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.kotlin)) },
  { name: "swift", label: "Swift", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/swift").then(module => module.swift)) },
  { name: "ruby", label: "Ruby", aliases: ["rb"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/ruby").then(module => module.ruby)) },
  { name: "scala", label: "Scala", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.scala)) },
  { name: "dart", label: "Dart", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.dart)) },
  { name: "objectivec", label: "Objective-C", aliases: ["objc", "objective-c"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/clike").then(module => module.objectiveC)) },
  { name: "lua", label: "Lua", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/lua").then(module => module.lua)) },
  { name: "perl", label: "Perl", aliases: ["pl"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/perl").then(module => module.perl)) },
  { name: "r", label: "R", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/r").then(module => module.r)) },
  { name: "groovy", label: "Groovy", aliases: ["gradle"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/groovy").then(module => module.groovy)) },
  { name: "haskell", label: "Haskell", aliases: ["hs"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/haskell").then(module => module.haskell)) },
  { name: "erlang", label: "Erlang", aliases: ["erl"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/erlang").then(module => module.erlang)) },
  { name: "sql", label: "SQL", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/sql").then(module => module.standardSQL)) },
  { name: "mysql", label: "MySQL", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/sql").then(module => module.mySQL)) },
  { name: "postgresql", label: "PostgreSQL", aliases: ["postgres", "pgsql"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/sql").then(module => module.pgSQL)) },
  { name: "bash", label: "Shell", aliases: ["sh", "shell", "zsh"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/shell").then(module => module.shell)) },
  { name: "powershell", label: "PowerShell", aliases: ["ps1", "pwsh"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/powershell").then(module => module.powerShell)) },
  { name: "json", label: "JSON", load: () => import("@quirekit/cm-lang-json").then(module => module.json()) },
  { name: "yaml", label: "YAML", aliases: ["yml"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/yaml").then(module => module.yaml)) },
  { name: "toml", label: "TOML", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/toml").then(module => module.toml)) },
  { name: "ini", label: "INI / Properties", aliases: ["properties"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/properties").then(module => module.properties)) },
  { name: "xml", label: "XML", aliases: ["svg"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/xml").then(module => module.xml)) },
  { name: "html", label: "HTML", load: () => import("@quirekit/cm-lang-html").then(module => module.html()) },
  { name: "css", label: "CSS", load: () => import("@quirekit/cm-lang-css").then(module => module.css()) },
  { name: "markdown", label: "Markdown", aliases: ["md"], load: () => import("@quirekit/cm-lang-markdown").then(module => module.markdown({ addKeymap: false })) },
  { name: "dockerfile", label: "Dockerfile", aliases: ["docker"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/dockerfile").then(module => module.dockerFile)) },
  { name: "nginx", label: "Nginx", load: legacy(() => import("@quirekit/cm-legacy-modes/mode/nginx").then(module => module.nginx)) },
  { name: "protobuf", label: "Protocol Buffers", aliases: ["proto"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/protobuf").then(module => module.protobuf)) },
  { name: "diff", label: "Diff", aliases: ["patch"], load: legacy(() => import("@quirekit/cm-legacy-modes/mode/diff").then(module => module.diff)) },
];
