import type { SyntaxNode } from "@lezer/common";
import { readSourceDestination, sourceDocument, sourceNode, type SourceDocument } from "@quirekit/msfe-core";
import { normalizeFootnoteLabel, queryFootnotes } from "@quirekit/msfe-markdown-extras";
import type { ReadingContext } from "../reading/types";
import type { ReadingContribution } from "../contributions/types";
import type { BlockDependencies, DependencyKey, MarkdownRenderWork } from "./types";

/** Current-frame queries share one source facade and evaluate each custom key once. */
export class DependencyReader<Output> {
  private readonly document: SourceDocument;
  private readonly keys = new Map<ReadingContribution<Output>, DependencyKey>();
  /** @param context - Current accepted snapshot. @param work - Mutable work counters for this projection. */
  constructor(private readonly context: ReadingContext<Output>, private readonly work: MarkdownRenderWork) { this.document = sourceDocument(context.state); }

  /** @param label - Raw Markdown label. @returns Only the semantics consumed by a destination renderer. */
  private reference(label: string): string {
    const result = this.document.resolveReference(label);
    return JSON.stringify(result.status === "resolved" ? [result.status, result.definition.url, result.definition.title] : [result.status]);
  }
  /** @param label - Normalized label. @returns Numbering, first-wins definition and backlink semantics. */
  private footnote(label: string): string {
    const index = queryFootnotes(this.context.state), entry = index.entries.get(label);
    return JSON.stringify([index.status, entry?.number, entry?.definition?.from, entry?.references[0]?.from]);
  }
  /** @param from - Inline note's accepted position. @returns Its ready/pending and ordinal inputs. */
  private inline(from: number): string {
    const index = queryFootnotes(this.context.state);
    return JSON.stringify([index.status, index.inline.get(from)]);
  }
  /** @param contribution - A candidate codec/reader, including candidates that decline this syntax. @returns Declared external input or a conservative miss. */
  private key(contribution: ReadingContribution<Output>): DependencyKey {
    const cached = this.keys.get(contribution);
    if (cached) return cached;
    let result: DependencyKey = { reusable: false, value: undefined };
    if (contribution.definition.cacheKey) {
      try { result = { reusable: true, value: contribution.definition.cacheKey(this.document) }; }
      catch (cause) { this.context.report({ owner: contribution.owner, phase: "read", from: 0, to: this.document.length, cause }); }
    }
    this.keys.set(contribution, result); return result;
  }

  /** @param root - New top-level block. @returns A syntax-owned summary, independent of deferred framework component execution. */
  collect(root: SyntaxNode): BlockDependencies<Output> {
    const result: BlockDependencies<Output> = { reusable: true, references: new Map(), footnotes: new Map(), inline: new Map(), keys: new Map() };
    const policy = this.context.options.html;
    // Intercept the public destination reader's reference query, including unresolved
    // candidates. Reuse its grammar/normalization instead of maintaining a second parser.
    const document: SourceDocument = { ...this.document, resolveReference: label => {
      const resolved = this.document.resolveReference(label); result.references.set(label, this.reference(label)); return resolved;
    } };
    root.cursor().iterate(cursor => {
      this.work.dependencyNodes++;
      const node = cursor.node;
      if (node.name === "Link" || node.name === "Image") readSourceDestination(document, sourceNode(node));
      if (node.name === "FootnoteReference" || node.name === "FootnoteDefinition") {
        const label = node.getChild("FootnoteLabel");
        if (label) { const value = normalizeFootnoteLabel(this.context.state.sliceDoc(label.from, label.to)); result.footnotes.set(value, this.footnote(value)); }
      }
      if (node.name === "InlineFootnote") result.inline.set(node.from, this.inline(node.from));
      if ((node.name === "HTMLTag" || node.name === "HTMLBlock") && typeof policy === "object" && (policy.allowLink || policy.allowImage)) result.reusable = false;
      for (const contribution of this.context.contributions.get(node.name) ?? []) {
        const key = this.key(contribution); result.keys.set(contribution, key.value);
        if (!key.reusable) result.reusable = false;
      }
    });
    return result;
  }

  /** @param dependencies - Previously captured local block inputs. @returns Whether every non-local input is still equivalent. */
  matches(dependencies: BlockDependencies<Output>): boolean {
    for (const [label, value] of dependencies.references) { this.work.semanticChecks++; if (this.reference(label) !== value) return false; }
    for (const [label, value] of dependencies.footnotes) { this.work.semanticChecks++; if (this.footnote(label) !== value) return false; }
    for (const [from, value] of dependencies.inline) { this.work.semanticChecks++; if (this.inline(from) !== value) return false; }
    for (const [contribution, value] of dependencies.keys) {
      this.work.semanticChecks++; const key = this.key(contribution);
      if (!key.reusable || !Object.is(key.value, value)) return false;
    }
    return dependencies.reusable;
  }
}
