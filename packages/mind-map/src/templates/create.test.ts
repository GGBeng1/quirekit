import { describe, expect, it } from "vitest";
import { createMindMapTemplate } from "./create";
import { mindMapTemplates } from "./catalog";
import { parseMindMap, serializeMindMap } from "../model/document";

describe("portable templates", () => {
  it.each(mindMapTemplates.map(template => template.id))("creates an independent canonical %s document", id => {
    const first = createMindMapTemplate(id), second = createMindMapTemplate(id);
    expect(second).toEqual(first); expect(second).not.toBe(first); expect(second.root).not.toBe(first.root);
    expect(Object.isFrozen(first.root.children)).toBe(true);
    expect(parseMindMap(serializeMindMap(first))).toEqual(first);
    expect(first.revision).toBe(0);
    expect(mindMapTemplates.find(template => template.id === id)?.title).toBeTruthy();
  });
  it("exposes only immutable content metadata and rejects unknown names", () => {
    expect(mindMapTemplates).toHaveLength(20); expect(Object.isFrozen(mindMapTemplates)).toBe(true);
    expect(() => createMindMapTemplate("unknown" as "blank")).toThrow(/template/);
    expect(createMindMapTemplate("project").root.text).toBe("项目推进");
  });
  it("offers actual persisted design and structure diversity, not thumbnail-only variations", () => {
    const documents = mindMapTemplates.map(template => createMindMapTemplate(template.id));
    expect(new Set(mindMapTemplates.map(template => template.id)).size).toBe(20);
    expect(new Set(mindMapTemplates.map(template => template.category)).size).toBe(4);
    expect(new Set(documents.map(document => document.layout)).size).toBe(3);
    expect(new Set(documents.map(document => document.root.style?.fill)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(documents.map(document => document.root.style?.shape)).size).toBe(4);
    expect(new Set(documents.map(document => document.root.style?.lineStyle)).size).toBe(3);
    expect(documents.every(document => document.version === 3 && document.revision === 0)).toBe(true);
    expect(createMindMapTemplate("project").root.children).toHaveLength(3);
    expect(createMindMapTemplate("blank").root.children).toHaveLength(0);
    expect(createMindMapTemplate("goals").root.children[0]!.children[0]!.children.length).toBeGreaterThan(0);
  });
});
