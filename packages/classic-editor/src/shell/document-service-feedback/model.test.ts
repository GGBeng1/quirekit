import { describe, expect, it } from "vitest";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import type {
  BuiltinClassicEditorMessageKey,
  BuiltinClassicEditorMessageParameters
} from "@classic/localization";
import {
  formatDeduplicatedDocumentServiceFeedbackForClipboard,
  formatDocumentServiceFeedbackForClipboard
} from "./clipboard";
import {
  createDocumentServiceErrorFeedback,
  createDocumentServiceReportFeedback
} from "./model";

/**
 * Resolves Chinese product copy for model-only tests.
 *
 * @param key - Built-in message identity.
 * @param parameters - Optional named replacements.
 * @returns Localized Chinese feedback.
 */
function message(
  key: BuiltinClassicEditorMessageKey,
  parameters?: BuiltinClassicEditorMessageParameters
): string {
  return resolveBuiltinClassicEditorMessage("zh-CN", key, parameters);
}

/**
 * Resolves English product copy for locale-switch coverage.
 *
 * @param key - Built-in message identity.
 * @param parameters - Optional named replacements.
 * @returns Localized English feedback.
 */
function englishMessage(
  key: BuiltinClassicEditorMessageKey,
  parameters?: BuiltinClassicEditorMessageParameters
): string {
  return resolveBuiltinClassicEditorMessage("en", key, parameters);
}

describe("document-service feedback model", () => {
  it("names a failed import and explains that the current document was preserved", () => {
    const error = Object.assign(new Error("Unsupported package."), {
      code: "unsupported-compound-file-container"
    });
    expect(createDocumentServiceErrorFeedback({
      contribution: {
        kind: "document-service",
        id: "docx.import",
        menuId: "import",
        menuLabel: "导入",
        label: "Word 文档 (.docx)",
        service: "docx",
        operation: "import"
      },
      fileName: "broken.docx",
      error
    }, message, "Word 文档 (.docx)")).toEqual({
      operation: "import",
      serviceId: "docx",
      tone: "error",
      title: "导入失败，当前文档未更改",
      summary: "broken.docx",
      items: [{
        code: "unsupported-compound-file-container",
        message: "Unsupported package."
      }]
    });
  });

  it("presents informational preservation as success and retains localized details", () => {
    expect(createDocumentServiceReportFeedback({
      operation: "import",
      serviceId: "docx",
      fileName: "document.docx",
      warnings: [],
      diagnostics: [{
        code: "last-rendered-page-break-preserved",
        message: "Preserved a producer last-rendered page-break hint without applying authored pagination.",
        path: "document.body[0]",
        severity: "info",
        disposition: "preserved"
      }, {
        code: "word-inline-content-control-preserved",
        message: "Preserved an inline Word content control and delegated its editable body to native child owners.",
        path: "document.body[1]",
        severity: "info",
        disposition: "preserved"
      }]
    }, message)).toEqual({
      operation: "import",
      serviceId: "docx",
      tone: "success",
      title: "导入完成",
      summary: "document.docx",
      items: [{
        code: "last-rendered-page-break-preserved",
        message: "历史分页位置提示：已保留来源应用上次排版时记录的分页位置；它不会被当作作者设置的强制分页。",
        path: "document.body[0]",
        severity: "info",
        disposition: "preserved"
      }, {
        code: "word-inline-content-control-preserved",
        message: "行内内容控件：已完整保留 Word 控件及其可编辑内容，内容仍由对应的原生功能处理。",
        path: "document.body[1]",
        severity: "info",
        disposition: "preserved"
      }]
    });
  });

  it("keeps source copy as the fallback for unknown diagnostics", () => {
    expect(createDocumentServiceReportFeedback({
      operation: "export",
      serviceId: "docx",
      fileName: "document.docx",
      warnings: [],
      diagnostics: [{
        code: "drawing-raw-regenerated",
        message: "Regenerated stale DrawingML.",
        severity: "info",
        disposition: "preserved"
      }]
    }, message)).toMatchObject({
      title: "导出完成",
      items: [{
        code: "drawing-raw-regenerated",
        message: "Regenerated stale DrawingML."
      }]
    });
  });

  it("resolves known preservation diagnostics in English", () => {
    expect(createDocumentServiceReportFeedback({
      operation: "import",
      serviceId: "docx",
      fileName: "document.docx",
      warnings: [],
      diagnostics: [{
        code: "word-inline-content-control-preserved",
        message: "Source fallback.",
        severity: "info",
        disposition: "preserved"
      }]
    }, englishMessage)).toMatchObject({
      title: "Import completed",
      items: [{
        code: "word-inline-content-control-preserved",
        message: "Inline content control: preserved the Word control and its editable content, which remains owned by the corresponding native feature."
      }]
    });
  });

  it("keeps parser warnings and conversion errors visibly actionable", () => {
    expect(createDocumentServiceReportFeedback({
      operation: "import",
      serviceId: "docx",
      fileName: "source.docx",
      warnings: [{
        code: "PACKAGE_WARNING",
        message: "Package relationship was repaired."
      }],
      diagnostics: [{
        code: "unsupported-field",
        message: "A source field was rejected.",
        severity: "error",
        disposition: "rejected"
      }]
    }, message)).toMatchObject({
      tone: "error",
      title: "已导入，但有 1 处内容未能完整保留",
      items: [
        { code: "PACKAGE_WARNING" },
        { code: "unsupported-field" }
      ]
    });
  });

  it("counts only actual issues while retaining informational projection details", () => {
    const detail = {
      operation: "export" as const,
      serviceId: "docx",
      fileName: "document.docx",
      warnings: [],
      diagnostics: [{
        code: "consumer-callout-projected-as-table",
        message: "Recoverable table projection.",
        severity: "info" as const,
        disposition: "approximated" as const
      }]
    };
    expect(createDocumentServiceReportFeedback(detail, message)).toMatchObject({
      tone: "success", title: "导出完成", items: detail.diagnostics
    });
    expect(createDocumentServiceReportFeedback({ ...detail, diagnostics: [
      ...detail.diagnostics,
      { code: "source-unavailable", message: "Cannot recover source.", severity: "warning" }
    ] }, message)).toMatchObject({
      tone: "warning", title: "导出完成，但发现 1 个兼容性问题",
      items: [detail.diagnostics[0], { code: "source-unavailable" }]
    });
  });

  it("counts content losses in the title and keeps locatable positions", () => {
    expect(createDocumentServiceReportFeedback({
      operation: "export",
      serviceId: "docx",
      fileName: "report.docx",
      warnings: [],
      diagnostics: [
        {
          code: "codec-failed",
          message: "DOCX export codec failed.",
          path: "document.body[2]",
          severity: "error",
          disposition: "rejected",
          position: 14
        },
        {
          code: "export-node-text-fallback",
          message: "Exported as plain text.",
          path: "document.body[2]",
          severity: "error",
          disposition: "approximated",
          position: 14
        },
        {
          code: "highlight-approximated",
          message: "Approximated a highlight.",
          severity: "warning",
          disposition: "approximated"
        }
      ]
    }, message)).toMatchObject({
      tone: "error",
      title: "已导出，但有 2 处内容未能完整保留",
      items: [
        {
          code: "codec-failed",
          message: "这一处内容转换出错，已尽量保留其中的文字。",
          position: 14
        },
        {
          code: "export-node-text-fallback",
          message: "这一处内容已按纯文本导出，原有格式和结构未保留。",
          position: 14
        },
        { code: "highlight-approximated", message: "Approximated a highlight." }
      ]
    });
  });

  it("formats complete machine-readable issue context for one-click copying", () => {
    const feedback = createDocumentServiceReportFeedback({
      operation: "import",
      serviceId: "docx",
      fileName: "source.docx",
      warnings: [{
        code: "PACKAGE_WARNING",
        message: "Package relationship was repaired.",
        path: "word/_rels/document.xml.rels"
      }],
      diagnostics: [{
        code: "unsupported-field",
        message: "A source field was rejected.",
        path: "document.body[1]",
        severity: "error",
        disposition: "rejected"
      }]
    }, message);

    expect(formatDocumentServiceFeedbackForClipboard(feedback)).toBe([
      "QuireKit Document Service Report",
      "operation: import",
      "service: docx",
      "tone: error",
      "result: 已导入，但有 1 处内容未能完整保留",
      "summary: source.docx",
      "items: 2",
      "",
      "[1]",
      "code: PACKAGE_WARNING",
      "path: word/_rels/document.xml.rels",
      "message: Package relationship was repaired.",
      "",
      "[2]",
      "code: unsupported-field",
      "severity: error",
      "disposition: rejected",
      "path: document.body[1]",
      "message: A source field was rejected."
    ].join("\n"));
  });

  it("deduplicates repeated semantic issues without treating paths as identity", () => {
    const feedback = createDocumentServiceReportFeedback({
      operation: "import",
      serviceId: "docx",
      fileName: "source.docx",
      warnings: [],
      diagnostics: [{
        code: "unsupported-node-dropped",
        message: "Dropped unsupported LitAST permStart.",
        path: "document.body[0].children[1]",
        severity: "warning",
        disposition: "rejected"
      }, {
        code: "unsupported-node-dropped",
        message: "Dropped unsupported LitAST permStart.",
        path: "document.body[8].children[2]",
        severity: "warning",
        disposition: "rejected"
      }, {
        code: "unsupported-node-dropped",
        message: "Dropped unsupported LitAST permEnd.",
        path: "document.body[9].children[0]",
        severity: "warning",
        disposition: "rejected"
      }]
    }, message);

    expect(
      formatDeduplicatedDocumentServiceFeedbackForClipboard(feedback)
    ).toBe([
      "QuireKit Document Service Report",
      "operation: import",
      "service: docx",
      "tone: warning",
      "result: 导入完成，但发现 3 个兼容性问题",
      "summary: source.docx",
      "items: 2",
      "source_items: 3",
      "deduplicated: true",
      "",
      "[1]",
      "code: unsupported-node-dropped",
      "severity: warning",
      "disposition: rejected",
      "occurrences: 2",
      "representative_path: document.body[0].children[1]",
      "message: Dropped unsupported LitAST permStart.",
      "",
      "[2]",
      "code: unsupported-node-dropped",
      "severity: warning",
      "disposition: rejected",
      "occurrences: 1",
      "representative_path: document.body[9].children[0]",
      "message: Dropped unsupported LitAST permEnd."
    ].join("\n"));
  });
});
