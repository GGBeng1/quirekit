import type { MindMapAnnotation, MindMapDetailsPatch } from "@quirekit/mind-map";
import type { MindEditorDrafts, MindEditorDraftWriter } from "./types";

/**
 * Keeps property input bounded and commits batches without losing concurrent edits.
 * @param write - Owned atomic renderer mutation.
 * @param changed - Small dirty-state invalidation; never serializes source.
 * @returns Draft authority for one workspace lifetime.
 */
export function createMindEditorDrafts(write: MindEditorDraftWriter, changed: () => void): MindEditorDrafts {
  const details = new Map<string, { patch: MindMapDetailsPatch; fields: Record<string, number> }>();
  const annotations = new Map<string, { value: MindMapAnnotation; generation: number }>();
  let generation = 0, inFlight: Promise<void> | undefined;
  /** @returns Completion of this captured batch; failed or newer input stays pending. */
  function flush(): Promise<void> {
    if (inFlight) return inFlight;
    if (!details.size && !annotations.size) return Promise.resolve();
    const capturedDetails = new Map(details), capturedAnnotations = new Map(annotations);
    inFlight = write({ details: [...capturedDetails].map(([id, entry]) => ({ ids: [id], patch: entry.patch })),
      annotations: [...capturedAnnotations.values()].map(entry => entry.value) }).then(() => {
      for (const [id, entry] of capturedDetails) {
        const current = details.get(id); if (!current) continue;
        const patch = { ...current.patch }, fields = { ...current.fields };
        for (const key of Object.keys(entry.patch) as (keyof MindMapDetailsPatch)[]) {
          if (fields[key] === entry.fields[key]) { delete patch[key]; delete fields[key]; }
        }
        if (Object.keys(patch).length) details.set(id, { patch, fields }); else details.delete(id);
      }
      for (const [id, entry] of capturedAnnotations) if (annotations.get(id)?.generation === entry.generation) annotations.delete(id);
      changed();
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  }
  return {
    /** @param update - Admitted checkpoint fields, kept pending against captured identities. */
    hydrate(update) {
      details.clear(); annotations.clear();
      for (const entry of update.details ?? []) for (const id of entry.ids) {
        const patch = entry.patch ?? { link: null, note: null, image: null, marker: null };
        const previous = details.get(id), fields = { ...previous?.fields };
        for (const key of Object.keys(patch)) fields[key] = ++generation;
        details.set(id, { patch: { ...previous?.patch, ...structuredClone(patch) }, fields });
      }
      for (const value of update.annotations ?? []) annotations.set(value.id, { value: structuredClone(value), generation: ++generation });
      changed();
    },
    /** @param ids - Stable target identities. @param patch - Only user-edited fields. */
    details(ids, patch) {
      for (const id of ids) {
        const previous = details.get(id), fields = { ...previous?.fields };
        for (const key of Object.keys(patch)) fields[key] = ++generation;
        details.set(id, { patch: { ...previous?.patch, ...structuredClone(patch) }, fields });
      }
      changed();
    },
    /** @param id - Topic identity. @returns Detached pending fields. */
    readDetails: id => structuredClone(details.get(id)?.patch ?? {}),
    /** @param value - Complete annotation with captured references. */
    annotation(value) { annotations.set(value.id, { value: structuredClone(value), generation: ++generation }); changed(); },
    /** @param id - Annotation identity. @returns Detached pending annotation, if present. */
    readAnnotation: id => { const value = annotations.get(id)?.value; return value ? structuredClone(value) : undefined; },
    /** @returns Detached captured content without a source or history read. */
    snapshot: () => structuredClone({ details: [...details].map(([id, entry]) => ({ ids: [id], patch: entry.patch })),
      annotations: [...annotations.values()].map(entry => entry.value) }),
    flush,
    /** @returns Completion of every pending generation before a save/export snapshot. */
    async settled() { do { await flush(); } while (details.size || annotations.size); },
    /** @returns Whether fields remain pending. */
    pending: () => details.size > 0 || annotations.size > 0,
  };
}
