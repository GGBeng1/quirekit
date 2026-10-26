import { docx } from "@quirekit/lit-docx-contract";
import type { DocxJsonNode, DocxJsonMark } from "@quirekit/docx";
import { projectWhiteboard, recoverWhiteboard, whiteboardDocxTag } from "./projection";
import type { WhiteboardDocxOptions } from "./types";

/** @param options - Optional source-recovery policy. @returns Feature-owned codec accepted by Classic and ordinary Core/Block DocxManager. */
export function createWhiteboardDocxCodec<ModelNode extends Pick<DocxJsonNode, "attrs"> = DocxJsonNode, ModelMark = DocxJsonMark>(options: WhiteboardDocxOptions = {}) {
  return docx.codec.node<ModelNode, ModelMark>({ id: "whiteboard.document", modelType: "whiteboard",
    export: { convert: ({ node, docx: api, report }) => [projectWhiteboard(node.attrs?.board, api, report, options)] },
    import: { from: docx.roundTrip.matchTag(whiteboardDocxTag), childContentKind: "block", creates: ["whiteboard", "paragraph"],
      convert: ({ node, docx: api, convertChildren, report }) => {
        const board = recoverWhiteboard(node, api);
        if (board) return [{ type: "whiteboard", attrs: { board } } as unknown as ModelNode];
        report({ code: "whiteboard-source-unavailable", severity: "warning", disposition: "approximated",
          message: "白板源缺失或可见内容已变化；保留当前 Word 图片，不恢复过期源。" });
        return convertChildren(node.children ?? []);
      } },
    capabilities: { fields: ["board"] },
  });
}
