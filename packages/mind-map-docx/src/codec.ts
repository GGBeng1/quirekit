import { docx } from "@quirekit/lit-docx-contract";
import type { DocxJsonNode, DocxJsonMark } from "@quirekit/docx";
import { mindMapDocxTag, projectMindMap, recoverMindMap } from "./projection";
import type { MindMapDocxOptions } from "./types";

/** @param options - Optional source recovery. @returns One feature codec shared by Classic and Core/Block document managers. */
export function createMindMapDocxCodec<ModelNode extends Pick<DocxJsonNode, "attrs"> = DocxJsonNode, ModelMark = DocxJsonMark>(options: MindMapDocxOptions = {}) {
  return docx.codec.node<ModelNode, ModelMark>({ id: "mind-map.document", modelType: "mindMap",
    export: { convert: ({ node, docx: api, report }) => [projectMindMap(node.attrs?.mind, api, report, options)] },
    import: { from: docx.roundTrip.matchTag(mindMapDocxTag), childContentKind: "block", creates: ["mindMap", "paragraph"],
      convert: ({ node, docx: api, convertChildren, report }) => {
        const mind = recoverMindMap(node, api);
        if (mind) return [{ type: "mindMap", attrs: { mind } } as unknown as ModelNode];
        report({ code: "mind-map-source-unavailable", severity: "warning", disposition: "approximated",
          message: "脑图源缺失、无效或可见内容已变化；保留当前 Word 内容，不恢复旧脑图。" });
        return convertChildren(node.children ?? []);
      } },
    capabilities: { fields: ["mind"] },
  });
}
