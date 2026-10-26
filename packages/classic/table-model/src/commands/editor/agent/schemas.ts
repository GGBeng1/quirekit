/** A row or column number as the view's (row,column) captions count them. */
export const ordinalSchema = { type: "integer", minimum: 1, description: "Counted from 1, as in the (row,column) captions of the view." };

/** A rectangle of cells, from its first row and column. */
export const rectProperties = {
  startRow: ordinalSchema,
  startColumn: ordinalSchema,
  rowSpan: { type: "integer", minimum: 1 },
  columnSpan: { type: "integer", minimum: 1 }
};

/** Required fields of a cell rectangle. */
export const rectRequired = ["startRow", "startColumn", "rowSpan", "columnSpan"];

/** A length in points, or null to clear it. */
export const pointsSchema = (minimum: number, maximum: number) => ({ anyOf: [{ type: "number", minimum, maximum }, { type: "null" }] });

/** A row height, or null to clear it. */
export const rowHeightSchema = {
  anyOf: [{
    type: "object", required: ["points", "rule"], additionalProperties: false,
    properties: { points: { type: "number", minimum: 1, maximum: 1584 }, rule: { enum: ["at-least", "exact"] } }
  }, { type: "null" }]
};

/** A margin side. */
export const sideSchema = { enum: ["top", "right", "bottom", "left"] };
