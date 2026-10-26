import type { QuireEditor } from "@quirekit/core";
import type { QuireImePreedit } from "@quirekit/view-engine";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import {
  describeCommittedPostUpdateContract,
  type PostUpdateContractView
} from "@quirekit/view/test-support/post-update";
import { htmlViewExtension } from "../extension";
import { createHtmlMountedView } from "../mount";

/** HTML presentation internals driven directly by the contract. */
interface HtmlPresentationAccess {
  /** Presentation owning the HTML update scheduler. */
  presentation: {
    /** HTML update scheduler. */
    scheduler: { flush(): void };
    /** Renders one request synchronously. */
    render(request: { editor: QuireEditor; reason: "selection" | "composition"; imePreedit?: QuireImePreedit }): void;
  };
}

/**
 * Reads the HTML presentation internals from a mounted view.
 *
 * @param view - Mounted HTML view.
 * @returns Presentation access.
 */
function access(view: PostUpdateContractView): HtmlPresentationAccess {
  return view as unknown as HtmlPresentationAccess;
}

describeCommittedPostUpdateContract({
  kind: "html",
  createDocument: () => new FakeSvgMountDocument(),
  createView: (options) => createHtmlMountedView(options) as unknown as PostUpdateContractView,
  extension: htmlViewExtension,
  usesGlobalFrames: true,
  // HTML emits diagnostics after its overlay commit; paginated observers run before completion.
  committedBeforeRenderObserver: 1,
  renderDirect: (view, editor, reason, imePreedit) =>
    access(view).presentation.render(imePreedit ? { editor, reason, imePreedit } : { editor, reason }),
  flush: (view) => access(view).presentation.scheduler.flush(),
  pointerSurface: (view) => (view.elements as { contentSurface: { dispatchEvent(event: Event): unknown } }).contentSurface
});
