const identity = { type: "string", minLength: 1, maxLength: 160 };

/** JSON Schema of an Agent mind map edit, shared by insertion and incremental update. */
export const mindMapDiagramSchema = Object.freeze({
  type: "object",
  properties: {
    title: { type: "string", maxLength: 200 },
    topics: { type: "array", maxItems: 400, items: { type: "object", additionalProperties: false, required: ["id"], properties: {
      id: identity, text: { type: "string", maxLength: 2000 }, parent: identity, index: { type: "integer", minimum: 0 },
      note: { anyOf: [{ type: "string", maxLength: 10000 }, { type: "null" }] },
      link: { anyOf: [{ type: "string", maxLength: 2000 }, { type: "null" }] },
      marker: { anyOf: [{ type: "string", enum: ["priority-1", "priority-2", "priority-3"] }, { type: "null" }] },
      collapsed: { type: "boolean" }
    } } },
    remove: { type: "array", maxItems: 400, items: identity },
    layout: { type: "string", enum: ["mind-map", "logical-right", "logical-left", "organization", "timeline"] }
  },
  additionalProperties: false
});
