import type { ChartSpec } from "../model/types";
import { assertChartSpec, ChartValidationError } from "../model/validation";
import type { ChartDraft, MutableChartValue } from "./types";

/**
 * Creates a detached editor draft without owning transactions or UI.
 * @param source - Immutable saved revision.
 * @returns Draft whose application checks both identity and revision.
 */
export function createChartDraft(source: ChartSpec): ChartDraft {
  let base = source;
  return {
    value: clone(source),
    /** @param current - Latest saved content. @returns Complete valid next revision, or the unchanged current authority. */
    prepare(current) {
      if (current.id !== base.id || current.revision !== base.revision) throw new ChartValidationError("revision", "chart-revision-conflict");
      if (this.value.id !== base.id || this.value.revision !== base.revision) throw new ChartValidationError("id", "chart-draft-identity-changed");
      const validated = assertChartSpec(this.value);
      return JSON.stringify(validated) === JSON.stringify(current)
        ? current : { ...validated, revision: base.revision + 1 };
    },
    /** @param current - Latest saved content. */
    reset(current) { base = current; this.value = clone(current); }
  };
}

/** @param value - Saved value. @returns Mutable detached draft. */
function clone(value: ChartSpec): MutableChartValue<ChartSpec> { return JSON.parse(JSON.stringify(value)); }
