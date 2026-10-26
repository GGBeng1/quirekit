/**
 * Checks high-level definition identity and direction.
 *
 * @param definition - Candidate definition.
 */
export function assertDocxCodecDefinition(definition: {
  readonly id: string;
  readonly modelType: string;
  readonly import?: unknown;
  readonly export?: unknown;
}): void {
  if (definition.id.trim().length === 0
    || definition.modelType.trim().length === 0) {
    throw new TypeError(
      "DOCX high-level codecs require non-empty id and modelType."
    );
  }
  if (definition.import === undefined && definition.export === undefined) {
    throw new TypeError(
      `DOCX high-level codec "${definition.id}" requires import or export.`
    );
  }
}

/**
 * Checks one high-level mark-attribute definition.
 *
 * @param definition - Candidate partial definition.
 */
export function assertDocxMarkAttributeDefinition(definition: {
  readonly id: string;
  readonly modelType: string;
  readonly modelAttributes: readonly string[];
  readonly import?: {
    readonly sourceAttributes: readonly string[];
  } | undefined;
  readonly export?: {
    readonly targetAttributes: readonly string[];
  } | undefined;
}): void {
  assertDocxCodecDefinition(definition);
  assertAttributeNames(
    definition.modelAttributes,
    definition.id,
    "modelAttributes"
  );
  if (definition.import !== undefined) {
    assertAttributeNames(
      definition.import.sourceAttributes,
      definition.id,
      "import.sourceAttributes"
    );
  }
  if (definition.export !== undefined) {
    assertAttributeNames(
      definition.export.targetAttributes,
      definition.id,
      "export.targetAttributes"
    );
  }
}

/**
 * Rejects empty, duplicate, or structural attribute names.
 *
 * @param names - Candidate exact attribute names.
 * @param id - Owning codec id.
 * @param field - Definition field being validated.
 */
function assertAttributeNames(
  names: readonly string[],
  id: string,
  field: string
): void {
  if (names.length === 0
    || names.some((name) => name.trim().length === 0 || name === "$type")
    || new Set(names).size !== names.length) {
    throw new TypeError(
      `DOCX mark-attribute codec "${id}" requires unique, non-structural ${field}.`
    );
  }
}
