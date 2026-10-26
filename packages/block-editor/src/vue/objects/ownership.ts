import { shallowRef, type ShallowRef } from "vue";
import type { Editor } from "@quirekit/core";

const owners = new WeakMap<Editor, ShallowRef<HTMLElement | null>>();
const releases = new WeakMap<Editor, () => void>();
const suspended = new WeakSet<Editor>();

/** @param editor - Document session. @returns Whether an explicit task suppresses incidental hover chrome. */
export function blockHoverToolsSuspended(editor: Editor): boolean { return suspended.has(editor); }

/** @param editor - Independent document session. @returns The one hovered or focused rich object, without document subscriptions. */
export function useBlockObjectToolbarOwner(editor: Editor): ShallowRef<HTMLElement | null> {
  let owner = owners.get(editor);
  if (!owner) { owner = shallowRef<HTMLElement | null>(null); owners.set(editor, owner); }
  return owner;
}

/** @param editor - Document session. @param root - Entered object. @param hide - Previous surface cleanup, without a document scan. @returns Whether this surface owns the tools. */
export function claimBlockObjectToolbar(editor: Editor, root: HTMLElement, hide: () => void): boolean {
  if (suspended.has(editor)) return false;
  const owner = useBlockObjectToolbarOwner(editor);
  if (owner.value === root) return true;
  releases.get(editor)?.();
  owner.value = root; releases.set(editor, hide);
  return true;
}

/** @param editor - Document whose explicit inline task supersedes incidental object hover. @returns Idempotent release. */
export function suspendBlockObjectToolbars(editor: Editor): () => void {
  releases.get(editor)?.(); releases.delete(editor); useBlockObjectToolbarOwner(editor).value = null;
  suspended.add(editor);
  return () => { suspended.delete(editor); };
}

/** @param editor - Document session. @param root - Leaving object, which cannot dismiss a newer owner. */
export function releaseBlockObjectToolbar(editor: Editor, root: HTMLElement): void {
  const owner = useBlockObjectToolbarOwner(editor);
  if (owner.value !== root) return;
  releases.get(editor)?.(); releases.delete(editor); owner.value = null;
}
