import type { QuireImePreedit } from "@quirekit/view-engine";
import { describe } from "vitest";
import { createCanvasMountedView } from "../../canvas/mount";
import { createSvgMountedView } from "../../svg/mount";
import { canvasViewExtension } from "../../canvas/extension";
import { svgViewExtension } from "../../svg/extension";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import { FakeSvgMountDocument } from "../../../../test-support/mount/svg";
import {
  describeCommittedPostUpdateContract,
  describePresentedCaretContract,
  type PostUpdateContractBackend,
  type PostUpdateContractView
} from "../../../../test-support/lifecycle/post-update-contract";

/** Paginated backend internals driven directly by the contract. */
interface PaginatedRuntimeAccess {
  /** Requests one synchronous paginated render. */
  requestPaginatedRender(request: { reason: "selection" | "composition"; imePreedit?: QuireImePreedit }): void;
  /** Mounted update scheduler. */
  mountedRuntime: { updates: { flush(): void } };
}

/**
 * Creates the contract adapter for one paginated backend.
 *
 * @param kind - Paginated backend mode.
 * @returns Contract backend adapter.
 */
function paginatedBackend(kind: "canvas" | "svg"): PostUpdateContractBackend {
  const access = (view: PostUpdateContractView) => view as unknown as PaginatedRuntimeAccess;
  return {
    kind,
    createDocument: () => kind === "canvas" ? new FakeCanvasMountDocument() : new FakeSvgMountDocument(),
    createView: (options) => (kind === "canvas" ? createCanvasMountedView : createSvgMountedView)(options) as unknown as PostUpdateContractView,
    extension: kind === "canvas" ? canvasViewExtension : svgViewExtension,
    usesGlobalFrames: false,
    committedBeforeRenderObserver: 0,
    renderDirect: (view, _editor, reason, imePreedit) => access(view).requestPaginatedRender(imePreedit ? { reason, imePreedit } : { reason }),
    flush: (view) => access(view).mountedRuntime.updates.flush(),
    pointerSurface: (view) => (view.elements as { root: { dispatchEvent(event: Event): unknown } }).root
  };
}

for (const kind of ["canvas", "svg"] as const) {
  const backend = paginatedBackend(kind);
  describeCommittedPostUpdateContract(backend);
  describe(`${kind} presented caret`, () => describePresentedCaretContract(backend));
}
