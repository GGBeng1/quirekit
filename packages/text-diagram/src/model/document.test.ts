import { describe, expect, it } from "vitest";
import { createTextDiagram, readTextDiagram, serializeTextDiagram, textDiagramLanguage, textDiagramMarkdown } from "./document";
describe("portable text diagrams", () => {
  it("starts each language with its own grammar and preserves an explicit empty draft", () => {
    expect(createTextDiagram("a", "mermaid").document.source).toMatch(/^flowchart/u);
    expect(createTextDiagram("a", "plantuml").document.source).toMatch(/^@startuml/u);
    expect(createTextDiagram("a", "dot").document.source).toMatch(/^digraph/u);
    expect(createTextDiagram("a", "dot", "").document.source).toBe("");
  });
  it("preserves grammar, Unicode, whitespace and immutable source", () => {
    const value = createTextDiagram("a", "plantuml", "@startuml\n甲 -> 乙 : 你好\n@enduml\n");
    expect(readTextDiagram(JSON.parse(serializeTextDiagram(value)))).toEqual(value);
    expect(Object.isFrozen(value.document)).toBe(true);
  });
  it("rejects unknown fields, versions, getters, excessive source and active previews", () => {
    const value = createTextDiagram("a");
    for (const bad of [{ ...value, version: 2 }, { ...value, extra: true }, { ...value, get title() { throw Error("getter executed"); } },
      { ...value, document: { ...value.document, source: "a".repeat(30_001) } }, { ...value, preview: { dataUrl: "https://example.com/image.png", width: 10, height: 10 } }]) {
      expect(() => readTextDiagram(bad)).toThrow();
    }
  });
  it("recognizes exact aliases and fences source without delimiter injection", () => {
    expect(["Mermaid", "puml", "graphviz"].map(textDiagramLanguage)).toEqual(["mermaid", "plantuml", "dot"]);
    expect(textDiagramLanguage("plantuml extra")).toBeNull();
    expect(textDiagramMarkdown("dot", 'digraph { a[label="```"] }')).toBe('````dot\ndigraph { a[label="```"] }\n````');
  });
});
