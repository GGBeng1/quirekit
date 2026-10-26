import type { QuireDisplayList } from "@quirekit/renderer";
import type { QuireViewDisplayListTransform } from "../../types";

const versions = new WeakMap<QuireViewDisplayListTransform, () => number>();

/**
 * Binds a framework-owned image transform to its current resource epoch.
 * @param transform - Exact transform owned by one mounted resource manager.
 * @param readVersion - Current epoch, advanced before publishing resource changes.
 */
export function registerMountedImageTransformVersion(
  transform: QuireViewDisplayListTransform,
  readVersion: () => number
): void {
  versions.set(transform, readVersion);
}

/**
 * Reads explicit resource authority without executing the transform.
 * @param transform - Current full-build transform.
 * @returns Current resource epoch, or undefined for an unknown callback.
 */
export function readMountedImageTransformVersion(transform: QuireViewDisplayListTransform): number | undefined {
  return versions.get(transform)?.();
}

/** Begin/end hooks bracketing one complete render-result transform. */
const passes = new WeakMap<QuireViewDisplayListTransform, { readonly begin: () => void; readonly end: () => void }>();

/**
 * Lets a resource manager learn which images the latest complete result still uses.
 * @param transform - Exact transform owned by one mounted resource manager.
 * @param pass - Hooks run before and after every list of one render result is transformed.
 */
export function registerMountedImageTransformPass(
  transform: QuireViewDisplayListTransform,
  pass: { readonly begin: () => void; readonly end: () => void }
): void {
  passes.set(transform, pass);
}

/**
 * @param transform - Current full-build transform.
 * @returns Pass hooks, or undefined for consumer transforms.
 */
export function readMountedImageTransformPass(transform: QuireViewDisplayListTransform) {
  return passes.get(transform);
}

/** Page-aware variant of a mounted image transform, keyed by the transform it accompanies. */
const pageTransforms = new WeakMap<QuireViewDisplayListTransform, (displayList: QuireDisplayList, pageIndex: number) => QuireDisplayList>();

/**
 * Lets a resource manager transform one page's chunk knowing which page it paints.
 * @param transform - Exact transform owned by one mounted resource manager.
 * @param transformPage - Transform of one page chunk of the committed snapshot.
 */
export function registerMountedImageTransformPage(
  transform: QuireViewDisplayListTransform,
  transformPage: (displayList: QuireDisplayList, pageIndex: number) => QuireDisplayList
): void {
  pageTransforms.set(transform, transformPage);
}

/**
 * @param transform - Current full-build transform.
 * @returns Page-aware variant, or undefined for consumer transforms.
 */
export function readMountedImageTransformPage(transform: QuireViewDisplayListTransform) {
  return pageTransforms.get(transform);
}
