const string = { type: "string", minLength: 1 } as const;
const optionalString = { type: "string" } as const;

/** JSON Schema (draft 2020-12) of a confirmed activity event, for validating records outside JavaScript. */
export const activityEventSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://quirekit.dev/schemas/edit-history/activity-event-1.json",
  title: "QuireKit activity event",
  type: "object",
  required: ["formatVersion", "id", "sequence", "acceptedAt", "retention", "documentId", "epoch", "operationId", "actor", "source", "kind", "kindVersion", "facts"],
  properties: {
    formatVersion: { const: 1 },
    id: string, documentId: string, epoch: string, operationId: string,
    sequence: { type: "integer", minimum: 1 },
    acceptedAt: { type: "string", format: "date-time" },
    occurredAt: { type: "string", format: "date-time" },
    retention: { enum: ["full", "summary"] },
    actor: { type: "object", required: ["id", "trust"], properties: { id: string, name: optionalString, avatar: optionalString, trust: { enum: ["verified", "local"] } } },
    source: { enum: ["human", "ai", "import", "system"] },
    kind: { type: "string", pattern: "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)*$" },
    kindVersion: { type: "integer", minimum: 1 },
    facts: { type: "object" },
    sessionId: optionalString,
    related: { type: "object", properties: { undoes: optionalString, parent: optionalString } },
    target: { type: "object", required: ["scheme", "value"], properties: { scheme: string, value: {}, quote: optionalString } },
    content: { type: "object", required: ["format", "truncated"], properties: { format: string, before: optionalString, after: optionalString, truncated: { type: "boolean" } } },
  },
} as const;

/** JSON Schema (draft 2020-12) of a confirmed version record. */
export const versionRecordSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://quirekit.dev/schemas/edit-history/version-record-1.json",
  title: "QuireKit version record",
  type: "object",
  required: ["formatVersion", "id", "documentId", "epoch", "sequence", "createdAt", "trigger", "content"],
  properties: {
    formatVersion: { const: 1 },
    id: string, documentId: string, epoch: string, name: optionalString,
    sequence: { type: "integer", minimum: 0 },
    createdAt: { type: "string", format: "date-time" },
    trigger: { enum: ["auto", "named", "restore", "import"] },
    actor: activityEventSchema.properties.actor,
    content: { type: "object", required: ["ref", "format", "bytes", "hash"], properties: { ref: string, format: string, bytes: { type: "integer", minimum: 0 }, hash: string } },
  },
} as const;
