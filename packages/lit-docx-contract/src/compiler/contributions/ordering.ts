import {
  failDocxContributionRegistration
} from "./registration-error.js";
import type { DocxContributionEntry } from "./types.js";

type AnyDocxContributionEntry = DocxContributionEntry<any, any, any>;

/**
 * Orders entries by explicit requirements while retaining declaration order.
 *
 * @param entries - Entries in owner and declaration order.
 * @param byId - Exact contribution id lookup.
 * @returns Dependency-ordered entries.
 */
export function orderDocxContributionEntries<
  Entry extends AnyDocxContributionEntry
>(
  entries: readonly Entry[],
  byId: ReadonlyMap<string, Entry>
): readonly Entry[] {
  for (const entry of entries) {
    for (const required of entry.contribution.requires ?? []) {
      if (!byId.has(required)) {
        failDocxContributionRegistration(
          "missing-required-contribution",
          `DOCX contribution "${entry.contribution.id}" requires missing contribution "${required}".`
        );
      }
    }
  }

  const ordered: Entry[] = [];
  const completed = new Set<string>();
  while (ordered.length < entries.length) {
    let progressed = false;
    for (const entry of entries) {
      const id = entry.contribution.id;
      if (completed.has(id)) continue;
      const ready = (entry.contribution.requires ?? [])
        .every((required) => completed.has(required));
      if (!ready) continue;
      ordered.push(entry);
      completed.add(id);
      progressed = true;
    }
    if (!progressed) {
      failDocxContributionRegistration(
        "cyclic-contribution-dependency",
        "DOCX contribution requirements contain a cycle."
      );
    }
  }
  return ordered;
}
