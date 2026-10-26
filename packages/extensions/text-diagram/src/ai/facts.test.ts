import { describe, expect, it } from "vitest";
import { createTextDiagram } from "@quirekit/text-diagram";
import { textDiagramAiItems, textDiagramAiLabel } from "./facts";

describe("text diagram AI facts", () => {
  it("shows the grammar and source, and reads long sources line by line", () => {
    const short = createTextDiagram("d-1", "mermaid", "flowchart LR\n  A[开始] --> B[发布]");
    expect(textDiagramAiLabel(short)).toBe('文本绘图 {"id":"d-1","revision":0,"title":"Mermaid","language":"mermaid","lines":2,"source":"flowchart LR\\n  A[开始] --> B[发布]"}');
    expect(textDiagramAiItems(short)).toEqual([{ id: "line-1", label: "flowchart LR" }, { id: "line-2", label: "  A[开始] --> B[发布]" }]);

    const long = createTextDiagram("d-2", "mermaid", `flowchart TD\n${Array.from({ length: 200 }, (_, index) => `  N${index} --> N${index + 1}`).join("\n")}`);
    expect(textDiagramAiLabel(long)).toContain('"truncated":true');
    expect(textDiagramAiItems(long)).toHaveLength(201);
  });
});
