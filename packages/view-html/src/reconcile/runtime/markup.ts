import type { HtmlDescriptor } from "../../descriptors";
import type { HtmlDomPatchHost, HtmlTargetDescriptor } from "../types";

/** Context required to patch retained schema shell markup. */
interface HtmlMarkupPatchContext {
  /** Narrow direct-DOM patch host. */
  readonly patchHost: HtmlDomPatchHost;
}

/**
 * Patches a compatible schema node shell when its markup attributes changed.
 *
 * @param descriptor - Retained node descriptor.
 * @param target - Desired node product.
 * @param context - Shared DOM creation and patch state.
 */
export function patchHtmlNodeMarkup(
  descriptor: Extract<HtmlDescriptor, { readonly kind: "node" }>,
  target: HtmlTargetDescriptor,
  context: HtmlMarkupPatchContext
): void {
  if (descriptor.node.sameMarkup(target.node)) {
    return;
  }
  const mount = target.candidateMount;

  if (mount?.dom.nodeType === 1) {
    context.patchHost.patchAttributes(descriptor, mount.dom as Element);
  }
}

/**
 * Patches a compatible mark wrapper when its attributes changed.
 *
 * @param descriptor - Retained mark descriptor.
 * @param target - Desired mark product.
 * @param context - Shared DOM creation and patch state.
 */
export function patchHtmlMarkMarkup(
  descriptor: Extract<HtmlDescriptor, { readonly kind: "mark" }>,
  target: HtmlTargetDescriptor,
  context: HtmlMarkupPatchContext
): void {
  if (!target.mark || descriptor.mark.eq(target.mark)) {
    return;
  }
  const mount = target.candidateMount;

  if (mount?.dom.nodeType === 1) {
    context.patchHost.patchAttributes(descriptor, mount.dom as Element);
  }
}
