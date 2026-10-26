import type {
  ClassicEditorDocumentServiceFeedback,
  ClassicEditorDocumentServiceFeedbackItem
} from "./types";

/**
 * Formats complete document-service feedback as stable plain text.
 *
 * @param feedback - Current visible feedback and retained diagnostic metadata.
 * @returns Paste-ready report for issue collection.
 */
export function formatDocumentServiceFeedbackForClipboard(
  feedback: ClassicEditorDocumentServiceFeedback
): string {
  return formatDocumentServiceFeedbackItemsForClipboard(
    feedback,
    feedback.items.map((item) => ({ item, occurrenceCount: 1 })),
    false
  );
}

/**
 * Formats document-service feedback after grouping repeated semantic issues.
 *
 * Paths are deliberately excluded from the grouping identity because they
 * describe occurrences, while code, message, severity, and disposition
 * describe the compatibility issue Codex needs to reason about.
 *
 * @param feedback - Current visible feedback and retained diagnostic metadata.
 * @returns Paste-ready report with one representative path and an occurrence count.
 */
export function formatDeduplicatedDocumentServiceFeedbackForClipboard(
  feedback: ClassicEditorDocumentServiceFeedback
): string {
  return formatDocumentServiceFeedbackItemsForClipboard(
    feedback,
    deduplicateDocumentServiceFeedbackItems(feedback.items),
    true
  );
}

/**
 * Groups exact semantic issues while retaining their first source occurrence.
 *
 * @param items - Ordered diagnostics from one document-service report.
 * @returns Source-ordered groups with occurrence counts.
 */
function deduplicateDocumentServiceFeedbackItems(
  items: readonly ClassicEditorDocumentServiceFeedbackItem[]
): ReadonlyArray<Readonly<{
  item: ClassicEditorDocumentServiceFeedbackItem;
  occurrenceCount: number;
}>> {
  const groups: Array<{
    item: ClassicEditorDocumentServiceFeedbackItem;
    occurrenceCount: number;
  }> = [];
  const groupIndexByIdentity = new Map<string, number>();
  for (const item of items) {
    const identity = JSON.stringify([
      item.code,
      item.message,
      item.severity ?? null,
      item.disposition ?? null
    ]);
    const existingIndex = groupIndexByIdentity.get(identity);
    if (existingIndex === undefined) {
      groupIndexByIdentity.set(identity, groups.length);
      groups.push({ item, occurrenceCount: 1 });
      continue;
    }
    const existing = groups[existingIndex];
    if (existing !== undefined) {
      groups[existingIndex] = {
        item: existing.item,
        occurrenceCount: existing.occurrenceCount + 1
      };
    }
  }
  return groups;
}

/**
 * Formats ordered diagnostic groups as stable plain text.
 *
 * @param feedback - Current visible feedback and retained report metadata.
 * @param groups - Ordered diagnostic groups to serialize.
 * @param deduplicated - Whether grouping metadata and representative paths apply.
 * @returns Paste-ready diagnostic text.
 */
function formatDocumentServiceFeedbackItemsForClipboard(
  feedback: ClassicEditorDocumentServiceFeedback,
  groups: ReadonlyArray<Readonly<{
    item: ClassicEditorDocumentServiceFeedbackItem;
    occurrenceCount: number;
  }>>,
  deduplicated: boolean
): string {
  const lines = [
    "QuireKit Document Service Report",
    ...(feedback.operation === undefined
      ? []
      : [`operation: ${feedback.operation}`]),
    ...(feedback.serviceId === undefined
      ? []
      : [`service: ${feedback.serviceId}`]),
    `tone: ${feedback.tone}`,
    `result: ${feedback.title}`,
    ...(feedback.summary === undefined
      ? []
      : [`summary: ${feedback.summary}`]),
    `items: ${groups.length}`,
    ...(deduplicated
      ? [
          `source_items: ${feedback.items.length}`,
          "deduplicated: true"
        ]
      : [])
  ];
  for (const [index, group] of groups.entries()) {
    const { item } = group;
    lines.push(
      "",
      `[${index + 1}]`,
      `code: ${item.code}`,
      ...(item.severity === undefined
        ? []
        : [`severity: ${item.severity}`]),
      ...(item.disposition === undefined
        ? []
        : [`disposition: ${item.disposition}`]),
      ...(deduplicated
        ? [`occurrences: ${group.occurrenceCount}`]
        : []),
      ...(item.path === undefined
        ? []
        : [deduplicated
            ? `representative_path: ${item.path}`
            : `path: ${item.path}`]),
      `message: ${item.message}`
    );
  }
  return lines.join("\n");
}
