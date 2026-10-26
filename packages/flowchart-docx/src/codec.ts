import { docx } from "@quirekit/lit-docx-contract";
import type { DocxJsonNode, DocxJsonMark } from "@quirekit/docx";
import { flowchartDocxTag, projectFlowchart, recoverFlowchart } from "./projection";
import type { FlowchartDocxOptions } from "./types";

/** @param options - Optional source recovery. @returns One feature codec shared by Classic and Core/Block document managers. */
export function createFlowchartDocxCodec<ModelNode extends Pick<DocxJsonNode, "attrs"> = DocxJsonNode, ModelMark = DocxJsonMark>(options: FlowchartDocxOptions = {}) {
  return docx.codec.node<ModelNode, ModelMark>({ id: "flowchart.document", modelType: "flowchart",
    export: { convert: ({ node, docx: api, report }) => [projectFlowchart(node.attrs?.flow, api, report, options)] },
    import: { from: docx.roundTrip.matchTag(flowchartDocxTag), childContentKind: "block", creates: ["flowchart", "paragraph"],
      convert: ({ node, docx: api, convertChildren, report }) => {
        const flow = recoverFlowchart(node, api);
        if (flow) return [{ type: "flowchart", attrs: { flow } } as unknown as ModelNode];
        report({ code: "flowchart-source-unavailable", severity: "warning", disposition: "approximated",
          message: "图形源缺失、无效或可见内容已变化；保留当前 Word 内容，不恢复旧图形。" });
        return convertChildren(node.children ?? []);
      } },
    capabilities: { fields: ["flow"] },
  });
}
