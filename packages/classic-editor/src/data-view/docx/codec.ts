import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";
import { dataViewDocxTag, projectDataView, recoverDataView } from "./projection";

/** Content and mark types of the Classic document model. */
type ModelMark = NonNullable<QuireJSONContent["marks"]>[number];

/** @returns Word projection of the dataView block: a native table that restores the block when left unchanged. */
export function createDataViewDocxCodec() {
  return docx.codec.node<QuireJSONContent, ModelMark>({ id: "dataView.document", modelType: "dataView",
    export: { convert: ({ node, docx: api, report }) => [projectDataView(node.attrs?.dataView, api, report)] },
    import: { from: docx.roundTrip.matchTag(dataViewDocxTag), childContentKind: "block", creates: ["dataView", "paragraph", "wordTable"],
      convert: ({ node, docx: api, convertChildren, report }) => {
        const dataView = recoverDataView(node, api);
        if (dataView) return [{ type: "dataView", attrs: { dataView } }];
        report({ code: "data-view-source-unavailable", severity: "warning", disposition: "approximated",
          message: "多维表格的恢复信息缺失、无效或表格内容已修改；保留当前 Word 内容。" });
        return convertChildren(node.children ?? []);
      } },
    capabilities: { fields: ["dataView"] }
  });
}
