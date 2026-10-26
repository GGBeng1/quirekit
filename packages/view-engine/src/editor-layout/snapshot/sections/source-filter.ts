import type { Node } from "@quirekit/pm";
import type { QuirePageModelProfile } from "../../../document-profile/types";
import type { QuireProseMirrorBlockInputOptions } from "../../prosemirror/types";

/**
 * Creates paragraph-cache-safe callbacks outside the compilation's graph scope.
 *
 * A cached reflow can outlive its frame. These closures must only retain the
 * page profile and source index, never a completed layout graph or its products.
 * @param pageModel - Existing document-model authority, preserving its receiver.
 * @param sectionIndex - Optional original top-level index for a section pass.
 * @param doc - Immutable source for profile-owned default character geometry.
 * @returns Body inclusion and container grid readers with bounded ownership.
 */
export function createQuireBodyFlowCallbacks(
  pageModel: QuirePageModelProfile,
  sectionIndex: number | undefined,
  doc?: Node
): Pick<QuireProseMirrorBlockInputOptions, "includeTopLevelBlock" | "resolveContainerLineGrid" | "resolveContainerCharacterGrid"> {
  return {
    includeTopLevelBlock: sectionIndex === undefined
      ? (node) => pageModel.isBodyFlowBlock(node)
      : (_node, index) => index === sectionIndex,
    resolveContainerLineGrid: (node) => pageModel.lineGrid(node),
    resolveContainerCharacterGrid: (node) => doc === undefined ? undefined : pageModel.characterGrid?.(node, doc)
  };
}
