import type { QuireKitMenuEntry, QuireKitToolbarEntry } from "@quirekit/ui";

/** @param value - Candidate public data. @returns Whether own fields describe a plain record. */
function isPlainRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && "value" in descriptor;
  });
}

/**
 * Compares only own data fields, leaving callbacks and opaque objects referential.
 * @param previous - Earlier public record.
 * @param next - Newly projected public record.
 * @returns Whether replacing the record has no observable field change.
 */
function sameRecord(previous: object | undefined, next: object | undefined): boolean {
  if (previous === next) return true;
  if (!previous || !next || !isPlainRecord(previous) || !isPlainRecord(next)) return false;
  const keys = Reflect.ownKeys(next);
  return keys.length === Reflect.ownKeys(previous).length && keys.every(key => {
    const before = Object.getOwnPropertyDescriptor(previous, key);
    const after = Object.getOwnPropertyDescriptor(next, key);
    return before && after && "value" in before && "value" in after && Object.is(before.value, after.value);
  });
}

/** @param previous - Earlier data record. @param next - New record. @returns Equal earlier data or current data. */
function retainRecord<T extends object>(previous: T | undefined, next: T | undefined): T | undefined {
  return sameRecord(previous, next) ? previous : next;
}

/**
 * Retains menu rows using their documented data fields and stable sibling values.
 * @param previous - Previous rows.
 * @param next - Latest rows.
 * @returns Reconciled rows preserving equal subtree identities.
 */
function retainMenuEntries(previous: readonly QuireKitMenuEntry[] | undefined, next: readonly QuireKitMenuEntry[]): readonly QuireKitMenuEntry[] {
  const byValue = new Map(previous?.map(entry => [entry.value, entry]));
  const result = next.map(entry => {
    if (!isPlainRecord(entry)) return entry;
    const before = byValue.get(entry.value);
    const candidate = entry.children === undefined ? entry : {
      ...entry, children: retainMenuEntries(before?.children, entry.children)
    };
    return sameRecord(before, candidate) ? before! : candidate;
  });
  return previous?.length === result.length && result.every((entry, index) => entry === previous[index]) ? previous : result;
}

/**
 * Keeps equal public presentation trees without serializing host payload or metadata.
 * @param previous - Last displayed entries owned by this placement.
 * @param next - Latest evaluated entries; command callbacks have already run.
 * @param sameMetadata - Optional comparison for shell-owned routing metadata only.
 * @returns Current entries with unchanged presentation nodes retaining identity.
 */
export function retainClassicToolbarEntries(
  previous: readonly QuireKitToolbarEntry[],
  next: readonly QuireKitToolbarEntry[],
  sameMetadata: (previous: unknown, next: unknown) => boolean = Object.is
): readonly QuireKitToolbarEntry[] {
  const byValue = new Map(previous.map(entry => [entry.value, entry]));
  const result = next.map(entry => {
    const before = byValue.get(entry.value);
    if (entry === before) return entry;
    if (!isPlainRecord(entry)) return entry;
    const attributes = retainRecord(before?.attributes, entry.attributes);
    const overlay = entry.overlayProps;
    const overlayProps = overlay === undefined || !isPlainRecord(overlay) ? overlay : retainRecord(before?.overlayProps, {
      ...overlay,
      ...(overlay.contentAttributes === undefined ? {} : {
        contentAttributes: retainRecord(before?.overlayProps?.contentAttributes, overlay.contentAttributes) ?? overlay.contentAttributes
      })
    });
    const candidate: QuireKitToolbarEntry = {
      ...entry,
      ...(attributes === undefined ? {} : { attributes }),
      ...(overlayProps === undefined ? {} : { overlayProps }),
      ...(entry.children === undefined ? {} : { children: retainClassicToolbarEntries(before?.children ?? [], entry.children, sameMetadata) }),
      ...(entry.items === undefined ? {} : { items: retainMenuEntries(before?.items, entry.items) }),
      ...(before && sameMetadata(before.meta, entry.meta) && "meta" in entry ? { meta: before.meta } : {})
    };
    return sameRecord(before, candidate) ? before! : candidate;
  });
  return previous.length === result.length && result.every((entry, index) => entry === previous[index]) ? previous : result;
}
