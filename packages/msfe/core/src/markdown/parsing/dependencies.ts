import type { InlineContext } from "@quirekit/lezer-markdown";
import type { ReferenceCertificate, ReferenceInlineTrace, ReferenceParseWork, ReferenceTrace } from "./types";

/** @param trace - Parse-local dependency observations. @param context - Native inline source owner.
 * @param label - Normalized label whose presence is about to be queried. @param work - Actual recording work. */
export function recordReferenceDependency(trace: ReferenceTrace, context: InlineContext, label: string, work: ReferenceParseWork): void {
  work.dependencyReads++;
  const key = `${context.offset}:${context.end}`;
  let entry = trace.get(key);
  if (!entry) { entry = { from: context.offset, to: context.end, labels: new Set() }; trace.set(key, entry); }
  entry.labels.add(label);
}

/** @param certificate - Prior accepted grammar and its complete dependency proof.
 * @param labels - Current confirmed definition membership. @param work - Actual dependency comparisons.
 * @returns Whether every membership read that determined the old grammar has the same result. */
export function referenceDependenciesUnchanged(certificate: ReferenceCertificate | undefined, labels: ReadonlySet<string>, work: ReferenceParseWork): boolean {
  if (!certificate?.dependencies) return false;
  for (const label of certificate.dependencies) {
    work.dependencyChecks++;
    if (certificate.labels.has(label) !== labels.has(label)) return false;
  }
  work.dependencyReuses++;
  return true;
}

/** @param trace - Contexts observed only in the definition-aware parse. @param work - Actual trace ordering work.
 * @returns Source-ordered temporary contexts for the final native tree walk. */
export function orderedReferenceTrace(trace: ReferenceTrace, work: ReferenceParseWork): readonly ReferenceInlineTrace[] {
  return [...trace.values()].sort((a, b) => { work.traceComparisons++; return a.from - b.from || a.to - b.to; });
}

/**
 * Attaches proof only when a full native inline context matches the accepted paragraph.
 * Nested contexts contribute a conservative union, so their label reads cannot disappear.
 * @param from - Paragraph start in current source coordinates. @param to - Exclusive paragraph end.
 * @param trace - Ordered observations from this parse. @param work - Actual lookup/merge work.
 * @returns Complete label dependencies, or no proof when ownership cannot be established.
 */
export function paragraphDependencies(from: number, to: number, trace: readonly ReferenceInlineTrace[], work: ReferenceParseWork): ReadonlySet<string> | undefined {
  if (!trace.length) return undefined;
  let low = 0, high = trace.length;
  while (low < high) {
    work.traceComparisons++;
    const middle = (low + high) >>> 1;
    if (trace[middle]!.from < from) low = middle + 1; else high = middle;
  }
  let complete = false;
  const labels = new Set<string>();
  for (let index = low; index < trace.length; index++) {
    work.traceComparisons++;
    const entry = trace[index]!;
    if (entry.from >= to) break;
    if (entry.to > to) return undefined;
    complete ||= entry.from === from && entry.to === to;
    for (const label of entry.labels) { work.traceComparisons++; labels.add(label); }
  }
  return complete ? labels : undefined;
}
