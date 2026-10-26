import { readQuireEditorLayoutAuthority, type QuireNodeCanvasTextStyleMap } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { ClassicEditorRenderContext } from "../../../types";
import { collectClassicEditorOutlineEntries, resolveClassicDocumentOutlineLevel } from "./model";
import type {
  ClassicEditorOutlineEntry,
  ClassicEditorOutlineHeadingSummary,
  ClassicEditorOutlineIdentityResolver
} from "./types";

/** Headings found under one node, relative to the node's content start. */
type HeadingSummaries = WeakMap<ProseMirrorNode, readonly ClassicEditorOutlineHeadingSummary[]>;

/**
 * Collects outline entries from per-node heading summaries kept across documents.
 *
 * A node's summary lists the headings among its descendants, so after an edit only the nodes on
 * the changed path are classified again. Classification also depends on extension style
 * definitions and their declared versions; the summaries are dropped whenever those differ,
 * and every projection classifies the whole document while any style callback is undeclared.
 *
 * @returns Collector owned by one mounted outline.
 */
export function createClassicEditorOutlineHeadingCollector() {
  let summaries: HeadingSummaries = new WeakMap();
  let authority: readonly unknown[] | undefined;
  let summarizedNodes = 0;

  /**
   * Collects heading entries in document order.
   *
   * @param context - Mounted product context.
   * @param untitledLabel - Fallback for an empty heading.
   * @param resolveIdentity - Mounted occurrence registry.
   * @returns Flat heading entries, equal to a full classification of the document.
   */
  function collect(
    context: ClassicEditorRenderContext,
    untitledLabel: string,
    resolveIdentity?: ClassicEditorOutlineIdentityResolver
  ): readonly ClassicEditorOutlineEntry[] {
    const current = readQuireEditorLayoutAuthority(context.editor, context.editor.state);
    if (!current.known) {
      authority = undefined;
      return collectClassicEditorOutlineEntries(context, untitledLabel, resolveIdentity);
    }
    if (authority === undefined || !sameTokens(authority, current.tokens)) {
      summaries = new WeakMap();
      authority = current.tokens;
    }
    const styles = context.editor.state.extensions.map(extension => extension.canvasTextStyle);
    const headings = summarize(context.editor.state.doc, styles);
    return Object.freeze(headings.map(heading => Object.freeze({
      id: resolveIdentity?.(heading.node, heading.offset) ?? `outline-${heading.offset}`,
      label: heading.label || untitledLabel,
      level: heading.level,
      position: heading.offset
    })));
  }

  /**
   * Lists the headings among a node's descendants, reusing retained summaries.
   *
   * Mirrors `descendants`: a heading is not searched further, any other node is.
   *
   * @param node - Document or non-heading node.
   * @param styles - Current extension style definitions.
   * @returns Headings with offsets relative to the node's content start.
   */
  function summarize(
    node: ProseMirrorNode,
    styles: readonly (QuireNodeCanvasTextStyleMap | undefined)[]
  ): readonly ClassicEditorOutlineHeadingSummary[] {
    const retained = summaries.get(node);
    if (retained !== undefined) return retained;
    summarizedNodes += 1;
    const headings: ClassicEditorOutlineHeadingSummary[] = [];
    node.forEach((child, offset) => {
      const level = resolveClassicDocumentOutlineLevel(styles, child);
      if (level !== null) {
        headings.push(Object.freeze({ node: child, offset, level, label: child.textContent }));
      } else if (!child.isLeaf) {
        for (const nested of summarize(child, styles)) {
          headings.push(Object.freeze({ ...nested, offset: offset + 1 + nested.offset }));
        }
      }
    });
    const frozen = Object.freeze(headings);
    summaries.set(node, frozen);
    return frozen;
  }

  return {
    collect,
    /** @returns Nodes classified since creation, read by work-count regressions. */
    readSummarizedNodes: () => summarizedNodes
  };
}

/**
 * Compares two layout authority token vectors.
 *
 * @param previous - Tokens the summaries were built under.
 * @param current - Current tokens.
 * @returns Whether every token is identical.
 */
function sameTokens(previous: readonly unknown[], current: readonly unknown[]): boolean {
  return previous.length === current.length && previous.every((token, index) => Object.is(token, current[index]));
}
