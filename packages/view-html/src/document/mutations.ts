import type { QuireViewMutationRecord } from "@quirekit/core";
import type { HtmlDescriptor, HtmlDocumentDesc } from "../descriptors";
import { walkHtmlDescriptors } from "../reconcile/ownership/descriptor-tree";
import {
  captureHtmlOwnedSubtree,
  restoreHtmlOwnedNode,
  type HtmlOwnedNodeSnapshot
} from "./mutation-snapshot";
import type {
  CreateHtmlMutationBoundaryOptions,
  HtmlMutationBoundary,
  HtmlMutationObserver,
  MutableHtmlMutationDiagnostics
} from "./mutations-types";

export type {
  CreateHtmlMutationBoundaryOptions,
  HtmlMutationBoundary,
  HtmlMutationDiagnostics,
  HtmlMutationObserver
} from "./mutations-types";

/**
 * Creates a bounded observer boundary around one retained document root.
 *
 * @param options - Surface, descriptor root, and observer inputs.
 * @returns Mutation classifier and recovery lifecycle.
 */
export function createHtmlMutationBoundary(
  options: CreateHtmlMutationBoundaryOptions
): HtmlMutationBoundary {
  const maxRecoveries = options.maxRecoveriesPerOwner ?? 2;
  const diagnostics: MutableHtmlMutationDiagnostics = {
    ownedRecordsDrained: 0,
    recoveries: 0,
    ignoredNodeViewRecords: 0,
    ignoredWidgetRecords: 0,
    recoveryRecordsDrained: 0,
    recoveryLimitHits: 0,
    rootReplacements: 0
  };
  let owners = new WeakMap<Node, HtmlDescriptor>();
  let snapshots = new WeakMap<Node, HtmlOwnedNodeSnapshot>();
  const recoveryCounts = new Map<string, number>();
  let destroyed = false;

  const rebuildAuthority = (): void => {
    owners = indexHtmlMutationOwners(options.root);
    snapshots = new WeakMap();
    captureHtmlOwnedSubtree(options.contentSurface, snapshots);
    recoveryCounts.clear();
  };
  const process = (records: readonly MutationRecord[]): void => {
    if (destroyed || records.length === 0) {
      return;
    }
    for (const record of records) {
      const rootDOM = options.root.mount?.dom;
      if (rootDOM && rootDOM.parentNode !== options.contentSurface) {
        diagnostics.rootReplacements += 1;
        restoreHtmlOwnedNode(options.contentSurface, snapshots);
      }
      const owner = findHtmlMutationOwner(record.target, owners);
      if (owner && routeHtmlOwnedMutation(owner, record)) {
        if (owner.kind === "widget") diagnostics.ignoredWidgetRecords += 1;
        else diagnostics.ignoredNodeViewRecords += 1;
        captureHtmlOwnedSubtree(record.target, snapshots);
        continue;
      }
      const ownerKey = owner?.id ?? "content-surface";
      const attempts = recoveryCounts.get(ownerKey) ?? 0;
      if (attempts >= maxRecoveries) {
        diagnostics.recoveryLimitHits += 1;
        continue;
      }
      recoveryCounts.set(ownerKey, attempts + 1);
      restoreHtmlOwnedNode(record.target, snapshots);
      diagnostics.recoveries += 1;
    }
    diagnostics.recoveryRecordsDrained += observer?.takeRecords().length ?? 0;
  };
  const observer = createObserver(options, process);

  rebuildAuthority();
  observer?.observe(options.contentSurface, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });

  return {
    drainOwnedWrites: () => {
      if (destroyed) {
        return;
      }
      diagnostics.ownedRecordsDrained += observer?.takeRecords().length ?? 0;
      rebuildAuthority();
    },
    process,
    getDiagnostics: () => ({ ...diagnostics }),
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      observer?.disconnect();
      owners = new WeakMap();
      snapshots = new WeakMap();
      recoveryCounts.clear();
    }
  };
}

/** Creates a native or injected observer when the environment supports one. */
function createObserver(
  options: CreateHtmlMutationBoundaryOptions,
  process: (records: readonly MutationRecord[]) => void
): HtmlMutationObserver | undefined {
  if (options.observerFactory) {
    return options.observerFactory((records) => process(records));
  }
  const Observer = options.contentSurface.ownerDocument.defaultView?.MutationObserver ??
    globalThis.MutationObserver;
  return typeof Observer === "function"
    ? new Observer((records) => process(records))
    : undefined;
}

/** Builds direct and ancestor lookup ownership for retained mounts. */
function indexHtmlMutationOwners(root: HtmlDocumentDesc): WeakMap<Node, HtmlDescriptor> {
  const owners = new WeakMap<Node, HtmlDescriptor>();
  walkHtmlDescriptors(root, (descriptor) => {
    if (descriptor.mount) {
      owners.set(descriptor.mount.dom, descriptor);
      if (descriptor.mount.contentDOM) {
        owners.set(descriptor.mount.contentDOM, descriptor);
      }
    }
  });
  return owners;
}

/** Finds the nearest retained descriptor owner for a mutation target. */
function findHtmlMutationOwner(
  target: Node,
  owners: WeakMap<Node, HtmlDescriptor>
): HtmlDescriptor | undefined {
  for (let current: Node | null = target; current; current = current.parentNode) {
    const owner = owners.get(current);
    if (owner) {
      return owner;
    }
  }
  return undefined;
}

/** Offers a record to exact custom view ownership. */
function routeHtmlOwnedMutation(
  owner: HtmlDescriptor,
  record: QuireViewMutationRecord
): boolean {
  // Widgets own their internal chrome. Their parent descriptor still owns
  // placement, so removing a widget is recovered through the parent's record.
  if (owner.kind === "widget") return record.type !== "selection";
  if (owner.kind === "node-view") {
    return owner.host?.ignoreMutation(record) === true;
  }
  if (owner.kind === "mark") {
    return owner.host?.ignoreMutation(record) === true;
  }
  return false;
}
