// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import type { WhiteboardSceneRenderer } from "@quirekit/whiteboard";
import { MsfeWhiteboard } from "./extension";
import { applyMsfeWhiteboardDiagram } from "./diagram";

const editors: MsfeEditor[] = [];
const render: WhiteboardSceneRenderer = async scene => ({ scene, preview: { dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 } });
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

describe("whiteboard preview", () => {
  it("mounts a document that already contains a whiteboard and labels it in the host language", async () => {
    const source = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown: "", extensions: [MsfeWhiteboard] });
    editors.push(source);
    expect(await applyMsfeWhiteboardDiagram(source, { title: "Plan", nodes: [{ id: "a", label: "Start" }], edges: [] }, render)).toBe("saved");
    const host = document.body.appendChild(document.createElement("div"));
    host.lang = "en";
    const editor = createMsfeEditor({ parent: host, mode: "live", markdown: source.getMarkdown(), extensions: [MsfeWhiteboard] });
    editors.push(editor);
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(host.querySelector("figcaption")).toBeNull();
    expect(host.querySelector("figure")?.getAttribute("aria-label")).toBe("Plan · Double-click to edit");
  });
});
