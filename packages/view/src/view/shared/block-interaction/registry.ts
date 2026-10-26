import type { QuireBlockPointerLease } from "@quirekit/core";
import type { MountedBlockPointerOwner } from "./types";

const owners = new WeakMap<object, MountedBlockPointerOwner>();

/** @param view - Owning mount. @param owner - Pointer lifecycle. @returns Unregister and cancel. */
export function registerMountedBlockPointerOwner(view: object, owner: MountedBlockPointerOwner): () => void {
  owners.set(view, owner);
  return () => { owner.cancel(); owners.delete(view); };
}
/** @param view - Owning mount. @param event - Initiating pointer. @param lease - Semantic callbacks. @returns Cancellation or refusal. */
export function beginMountedBlockPointerLease(view: object, event: PointerEvent, lease: QuireBlockPointerLease): (() => void) | null { return owners.get(view)?.begin(event, lease) ?? null; }
/** @param view - Updated mount. */
export function validateMountedBlockPointerLease(view: object): void { owners.get(view)?.validate(); }
