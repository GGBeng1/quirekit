import { describe, expect, it } from "vitest";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { mdExportFileName, setMdDocumentTitle } from "./name";

/** @param markdown - Document source. @returns Minimal source owner. */
const owner = (markdown: string) => ({ getMarkdown: () => markdown }) as unknown as MsfeEditor;

describe("mdExportFileName", () => {
  it("prefers the host title and removes characters file systems reject", () => {
    const editor = owner("# 正文标题");
    setMdDocumentTitle(editor, "周报: 2026/10 <草稿>");
    expect(mdExportFileName(editor, "pdf")).toBe("周报 2026 10 草稿.pdf");
  });

  it("falls back to the first heading, then to document", () => {
    expect(mdExportFileName(owner("前言\n\n## 第一章 ##\n"), "docx")).toBe("第一章.docx");
    expect(mdExportFileName(owner("没有标题"), "md")).toBe("document.md");
  });
});
