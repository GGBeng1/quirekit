import type { Editor } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { blockInsertItems } from "../../../ui/insert/catalog";
import { readBlockListFeature } from "../../../lists/feature";

/** @param editor - Installed content capabilities. @returns A presenter sharing the insertion directory's names and icons, built once per rail. */
export function createBlockRailPresenter(editor: Editor) {
  const items = blockInsertItems(editor), byId = new Map(items.map(item => [item.id, item]));
  /** @param node - Current canonical block. @returns Type identity, accessible description and empty-line affordance. */
  return function present(node: Node) {
    const list = readBlockListFeature(editor)?.kind(node, editor.state.doc);
    const type = node.type.name;
    const id = list ? `${list}List` : type === "heading" ? `heading:${node.attrs.level}`
      : type === "blockContainer" ? `container:${node.attrs.kind === "highlight" || node.attrs.kind === "details" ? node.attrs.kind : "note"}`
      : type === "footnoteDefinition" ? "footnoteReference" : type;
    const item = byId.get(id) ?? items.find(item => item.node === type);
    return { id: item?.id ?? id, icon: item?.icon ?? "paragraph", label: item?.label ?? "内容块",
      empty: type === "paragraph" && !list && node.content.size === 0 };
  };
}
