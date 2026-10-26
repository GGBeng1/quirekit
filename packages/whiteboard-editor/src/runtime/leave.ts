/**
 * Installs a native leave warning only while an owner has unsaved drawing content.
 * @param owner - Window containing this workspace.
 * @returns Cleanup for save, document replacement or unmount.
 */
export function guardWhiteboardLeave(owner: Window): () => void {
  /** @param event - Browser-owned navigation or reload decision. */
  function warn(event: BeforeUnloadEvent): void { event.preventDefault(); event.returnValue = ""; }
  owner.addEventListener("beforeunload", warn);
  return () => owner.removeEventListener("beforeunload", warn);
}
