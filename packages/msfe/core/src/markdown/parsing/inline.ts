import { InlineContext, type MarkdownParser, type MarkdownExtension } from "@quirekit/lezer-markdown";
import { normalizeIdentifier } from "micromark-util-normalize-identifier";
import type { ReferenceParseWork, ReferenceTrace } from "./types";
import { destinationEnvelope } from "./destination";
import { recordReferenceDependency } from "./dependencies";

/** @param context - Native inline grammar context. @param from - Following opening bracket. @returns Complete bounded label, or null when it cannot be a reference label. */
function followingLabel(context: InlineContext, from: number): string | null {
  const remaining = context.slice(from, Math.min(context.end, from + 1002));
  // Escaped brackets remain label spelling; unescaped nested brackets are not a label.
  const match = /^\[((?:\\[\s\S]|[^\[\]\\]){0,999})\]/u.exec(remaining);
  return match && match[1]!.length <= 999 ? match[1]! : null;
}

/**
 * Lets an undefined reference release its label for the native next parse step.
 * @param base - Configured grammar without this refinement, including the host dialect.
 * @param labels - Definitions become authoritative only after the complete first pass.
 * @param work - Actual matching work for this parse.
 * @param trace - Parse-local normalized membership reads.
 * @returns Public inline hooks; no private parser fields or replacement AST.
 */
export function referenceInline(base: MarkdownParser, labels: () => ReadonlySet<string> | undefined, work: ReferenceParseWork, trace: ReferenceTrace): MarkdownExtension {
  const openings = new WeakMap<InlineContext, number[]>();
  return { parseInline: [{ name: "ReferenceOpening", before: "Link",
    /** @param context - Existing grammar. @param next - Current character. @param position - Source position. @returns Native parser continues with the same opener. */
    parse(context, next, position) {
      if (labels() && (next === 91 || next === 33 && context.char(position + 1) === 91)) {
        let stack = openings.get(context); if (!stack) openings.set(context, stack = []);
        stack.push(position);
      }
      return -1;
    },
  }, { name: "ReferenceClosing", before: "LinkEnd",
    /** @param context - Existing grammar. @param next - Current character. @param position - Source position. @returns Rejected-reference close, or delegation to native LinkEnd. */
    parse(context, next, position) {
      const known = labels();
      if (!known || next !== 93) return -1;
      const opening = openings.get(context)?.pop();
      const link = context.findOpeningDelimiter(InlineContext.linkStart), image = context.findOpeningDelimiter(InlineContext.imageStart);
      const index = Math.max(link ?? -1, image ?? -1), delimiter = index < 0 ? null : context.getDelimiterAt(index);
      // A nested real link may invalidate an outer opener. Native LinkEnd owns that transition.
      if (!delimiter || opening !== delimiter.from) return -1;
      const body = context.slice(delimiter.to, position), after = context.char(position + 1);
      if (after === 40) {
        work.inlineChecks++;
        // Only the destination suffix is probed; its spelling and acceptance stay with the installed grammar.
        const end = destinationEnvelope(context, position + 1);
        const native = end === undefined ? undefined : base.parseInline(`[]${context.slice(position + 1, end)}`, 0)[0];
        if (native?.from === 0 && native.to > 2) return -1;
      }
      const explicit = after === 91 ? followingLabel(context, position + 1) : null;
      const label = explicit === null || explicit === "" ? body : explicit;
      if (label.length <= 999) {
        const normalized = normalizeIdentifier(label);
        recordReferenceDependency(trace, context, normalized, work);
        if (known.has(normalized)) return -1;
      }
      // Keep formatting inside literal brackets, but release the failed opener before the following label.
      for (const child of context.takeContent(index)) context.addElement(child);
      return position + 1;
    },
  }] };
}
