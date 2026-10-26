/** Shapes an Agent may use; lanes, sequences and pictures need their dedicated tools. */
export const flowchartAgentShapes = Object.freeze(["process", "terminator", "decision", "data", "document", "subprocess", "database",
  "ellipse", "rectangle", "circle", "cloud", "note", "text", "actor", "server", "browser", "mobile", "component", "package", "queue",
  "container", "uml-class", "er-entity"] as const);

const identity = { type: "string", minLength: 1, maxLength: 160 };
const coordinate = { type: "number", minimum: -1e6, maximum: 1e6 };
const size = { type: "number", minimum: 20, maximum: 10000 };
const line = { type: "string", maxLength: 300 };

/** JSON Schema of an Agent flowchart edit, shared by insertion and incremental update. */
export const flowchartDiagramSchema = Object.freeze({
  type: "object",
  properties: {
    title: { type: "string", maxLength: 200 },
    nodes: { type: "array", maxItems: 400, items: { type: "object", additionalProperties: false, required: ["id"], properties: {
      id: identity, text: { type: "string", maxLength: 2000 }, shape: { type: "string", enum: flowchartAgentShapes },
      parent: { anyOf: [identity, { type: "null" }] }, x: coordinate, y: coordinate, width: size, height: size,
      attributes: { type: "array", maxItems: 100, items: line }, operations: { type: "array", maxItems: 100, items: line },
      fields: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["name", "type"], properties: {
        name: line, type: line, key: { type: "string", enum: ["none", "primary", "foreign", "primary-foreign"] } } } }
    } } },
    edges: { type: "array", maxItems: 400, items: { type: "object", additionalProperties: false, required: ["id"], properties: {
      id: identity, from: identity, to: identity, label: { type: "string", maxLength: 500 }, dashed: { type: "boolean" } } } },
    remove: { type: "array", maxItems: 400, items: identity },
    layout: { type: "string", enum: ["down", "right"] }
  },
  additionalProperties: false
});
