import { docx } from "@quirekit/lit-docx-contract";
import type { DocxJsonNode, DocxJsonMark } from "@quirekit/docx";
import { projectTextDiagram, recoverTextDiagram, textDiagramDocxTag } from "./projection";

/** @returns Standard Word projection shared by Classic and Block hosts. */
export function createTextDiagramDocxCodec<ModelNode extends Pick<DocxJsonNode, "attrs"> = DocxJsonNode, ModelMark = DocxJsonMark>() {
  return docx.codec.node<ModelNode, ModelMark>({ id: "textDiagram.document", modelType: "textDiagram",
    export: { convert: ({ node, docx: api, report }) => [projectTextDiagram(node.attrs?.diagram, api, report)] },
    import: { from: docx.roundTrip.matchTag(textDiagramDocxTag), childContentKind: "block", creates: ["textDiagram", "paragraph"],
      convert: ({ node, docx: api, convertChildren, report }) => {
        const diagram = recoverTextDiagram(node, api);
        if (diagram) return [{ type: "textDiagram", attrs: { diagram } } as unknown as ModelNode];
        report({ code: "text-diagram-source-unavailable", severity: "warning", disposition: "approximated",
          message: "文本绘图源码缺失、无效或可见内容已变化；保留当前 Word 内容。" });
        return convertChildren(node.children ?? []);
      } }, capabilities: { fields: ["diagram"] },
  });
}
