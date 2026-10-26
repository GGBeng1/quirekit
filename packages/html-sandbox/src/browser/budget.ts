/** Default document-local admission budget; weak ownership cannot keep a document alive. */
const active = new WeakMap<Document, number>();
/** Reserve one active iframe without queueing hidden work.
 * @param document - Browsing document owning the host. @returns Idempotent release, or null at the limit.
 */
export function reserveFrame(document: Document): (() => void) | null {
  const count = active.get(document) ?? 0;
  if (count >= 8) return null;
  active.set(document, count + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (active.get(document) ?? 1) - 1;
    if (next <= 0) active.delete(document); else active.set(document, next);
  };
}
