import type { ChangeDesc } from "@quirekit/cm-state";
import { mapSourceRange } from "../../ranges/set";
import { createSourceIdentity } from "../../identity/uuid";
import type { LayerCache, ProjectionDecoration } from "./types";

/** @param item - One current declaration. @returns Its backend component placement identity, without content or absolute author keys. */
function placement(item: ProjectionDecoration): string {
  return `${item.type}:${item.from}:${"to" in item ? item.to : item.from}:${item.type === "widget" ? item.side ?? -1 : ""}`;
}

/** @param previous - Previous declarations. @param changes - Exact source transformation.
 * @returns Mapped ranges and coordinate props; no parsing, renderer calls or resource acquisition. */
export function mapLayerCache(previous: LayerCache, changes: ChangeDesc): LayerCache {
  if (changes.empty) return previous;
  const descriptions: ProjectionDecoration[] = [], identities = new Map<ProjectionDecoration, string>();
  for (const item of previous.descriptions) {
    const interval = mapSourceRange({ id: "projection", value: null, from: item.from, to: "to" in item ? item.to : item.from }, changes);
    if (!interval) continue;
    let mapped: ProjectionDecoration = { ...item, from: interval.from, ...("to" in item ? { to: interval.to } : {}) };
    if (mapped.type === "replace" && mapped.revealRange) {
      const owner = mapSourceRange({ ...mapped.revealRange, id: "owner", value: null }, changes);
      if (!owner) continue;
      mapped = { ...mapped, revealRange: { from: owner.from, to: owner.to } };
    }
    const offset = interval.from - item.from;
    if ("view" in mapped && mapped.view?.map && offset) mapped = { ...mapped,
      view: { ...mapped.view, props: mapped.view.map(mapped.view.props, offset) } };
    descriptions.push(mapped);
    const identity = previous.identities?.get(item);
    if (identity) identities.set(mapped, identity);
  }
  return { descriptions, identities, builds: previous.builds };
}

/** @param descriptions - Current complete or patched output. @param previous - Old output in current source coordinates.
 * @param builds - Actual builder evaluations. @returns Stable identities for untouched source placements and fresh identities for new placements. */
export function retainLayerIdentities(descriptions: readonly ProjectionDecoration[], previous: LayerCache | undefined, builds: number): LayerCache {
  const identities = new Map<ProjectionDecoration, string>(), candidates = new Map<string, ProjectionDecoration[]>();
  const accepted: ProjectionDecoration[] = [], seen = new Set<string>();
  for (const item of previous?.descriptions ?? []) {
    if (!("key" in item)) continue;
    const key = placement(item), bucket = candidates.get(key) ?? [];
    bucket.push(item); candidates.set(key, bucket);
  }
  for (const item of descriptions) {
    if (!("key" in item)) { accepted.push(item); continue; }
    // Disjoint visible intervals can query the same enclosing source owner.
    // Preserve the existing one-key/one-placement deduplication before assigning ids.
    const duplicate = JSON.stringify([item.key, placement(item)]);
    if (seen.has(duplicate)) continue;
    seen.add(duplicate); accepted.push(item);
    const bucket = candidates.get(placement(item));
    const index = bucket?.findIndex(candidate => "key" in candidate && candidate.view?.renderer === item.view?.renderer) ?? -1;
    const retained = index >= 0 ? bucket!.splice(index, 1)[0] : undefined;
    identities.set(item, (retained && previous?.identities?.get(retained)) ?? createSourceIdentity());
  }
  return { descriptions: accepted, identities, builds };
}
