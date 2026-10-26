/** DOM root that owns a mounted editor view. */
export type MountedViewRoot = Document | ShadowRoot;

/**
 * Resolves the document or shadow root that owns a mounted view element.
 *
 * @param rootElement - Mounted view root element.
 * @returns Document or shadow root that contains the mounted view.
 */
export function resolveMountedViewRoot(rootElement: HTMLElement): MountedViewRoot {
  const directRoot = rootElement.getRootNode?.();

  if (isMountedViewRoot(directRoot)) {
    prepareMountedViewRoot(directRoot);
    return directRoot;
  }

  for (
    let parent: Node | null | undefined = rootElement.parentNode;
    parent != null;
    parent = parent.parentNode
  ) {
    if (isMountedViewRoot(parent)) {
      prepareMountedViewRoot(parent);
      return parent;
    }
  }

  return rootElement.ownerDocument;
}

/**
 * Reports whether a node is a document or shadow root.
 *
 * @param node - Candidate node returned by DOM traversal.
 * @returns Whether the node can act as the mounted view root.
 */
function isMountedViewRoot(node: unknown): node is MountedViewRoot {
  if (node === null || node === undefined) {
    return false;
  }

  const candidate = node as { readonly nodeType?: number; readonly host?: unknown };

  return (
    candidate.nodeType === 9 ||
    (candidate.nodeType === 11 && candidate.host !== undefined)
  );
}

/**
 * Adds the selection fallback ProseMirror expects for older shadow roots.
 *
 * @param root - Resolved mounted view root.
 */
function prepareMountedViewRoot(root: MountedViewRoot): void {
  const maybeShadowRoot = root as ShadowRoot & {
    getSelection?: () => Selection | null;
  };

  if (root.nodeType !== 11 || maybeShadowRoot.getSelection !== undefined) {
    return;
  }

  maybeShadowRoot.getSelection = (): Selection | null =>
    maybeShadowRoot.ownerDocument.getSelection();
}
