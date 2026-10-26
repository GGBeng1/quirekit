import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import { createMsfeReadState } from "@quirekit/msfe-core";
import { createMarkdownExtensions } from "./extensions";
import type { MarkdownOptions } from "../types";

/** A headless source session; transport status never freezes syntax or reference dependencies. */
export class MarkdownStream {
  private source = "";
  private current: EditorState;

  /** @param options - Product grammar and trusted reading contributions, fixed for this session. */
  constructor(private readonly options: MarkdownOptions = {}) { this.current = this.create(""); }

  /** @returns Exact host source, before logical-newline normalization. */
  get content(): string { return this.source; }

  /** @param chunk - Next raw transport chunk; splitting a CRLF or surrogate pair is supported. */
  append(chunk: string): void { this.update(this.source + chunk); }

  /** @param content - New document, even when it equals the previous source. */
  reset(content = ""): void { this.current = this.create(content); this.source = content; }

  /** @returns Latest accepted immutable source and syntax, which may still be incomplete. */
  get state(): EditorState { return this.current; }

  /** @returns Whether the canonical parser still needs a continuation. */
  get pending(): boolean { return !syntaxTreeAvailable(this.current); }

  /** @param content - Authoritative full source, never repaired with synthetic closing markers. */
  update(content: string): void {
    if (content === this.source) return;
    if (content.startsWith(this.source)) {
      let suffix = content.slice(this.source.length);
      // A CR already became one logical newline. Completing CRLF must not append another.
      if (this.source.endsWith("\r") && suffix.startsWith("\n")) suffix = suffix.slice(1);
      if (suffix) this.current = this.current.update({ changes: { from: this.current.doc.length, insert: suffix }, filter: false }).state;
    } else this.current = this.create(content);
    this.source = content;
  }

  /** @param budget - Cooperative extra parse budget in milliseconds, not a hard grammar-step limit. @returns Whether all syntax and reference grouping is accepted. */
  advance(budget = 4): boolean {
    const tree = ensureSyntaxTree(this.current, this.current.doc.length, budget);
    // CM retains partial work internally. Accept its completed tree through the same
    // empty transaction used by forceParsing, without a hidden editable view.
    if (tree && tree !== syntaxTree(this.current)) this.current = this.current.update({ filter: false }).state;
    return tree !== null;
  }

  /** @param markdown - Replacement document. @returns A fresh installation, including extension-local storage. */
  private create(markdown: string): EditorState {
    return createMsfeReadState({ markdown, extensions: createMarkdownExtensions(this.options) });
  }
}
