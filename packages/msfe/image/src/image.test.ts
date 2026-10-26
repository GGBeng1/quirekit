// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { image } from "./image";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

it("shows a failed image resource on the image alone instead of reporting an editor fault", async () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const errors: unknown[] = [];
  const editor = createMsfeEditor({ parent, markdown: "开头\n\n![示意图](missing.png)\n", mode: "live", onError: error => errors.push(error),
    extensions: [image({ resolve: async () => { throw new Error("读取图片失败：No such file or directory"); } })] });
  editors.push(editor);
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(errors).toEqual([]);
  expect(parent.querySelector(".msfe-image")?.textContent).toBe("图片加载失败：示意图");
});
