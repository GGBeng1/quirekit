import type { QuireExtensionFieldSource } from "../types";

/** Context object used when binding extension config functions. */
export type QuireExtensionFieldContext = Readonly<Record<string, unknown>>;

/**
 * Resolves a field from an extension config source, following parent chains.
 *
 * Function fields are returned as functions bound to a Tiptap-compatible `this`
 * object that includes the provided context plus a `parent` field containing
 * the parent field value.
 *
 * @param extension - Extension, node, mark, or parent source to inspect.
 * @param field - Config field name to resolve.
 * @param context - Optional context exposed as `this` to function fields.
 * @returns Resolved field value, a bound function, or undefined.
 */
export function getExtensionField<Value = unknown>(
  extension: QuireExtensionFieldSource,
  field: string,
  context: QuireExtensionFieldContext = {}
): Value | undefined {
  const fieldValue = extension.config[field];

  if (fieldValue === undefined && extension.parent) {
    return getExtensionField<Value>(extension.parent, field, context);
  }

  if (typeof fieldValue === "function") {
    const parentField = extension.parent
      ? getExtensionField(extension.parent, field, context)
      : undefined;

    return (fieldValue as (...args: readonly unknown[]) => unknown).bind({
      ...context,
      parent: parentField
    }) as Value;
  }

  return fieldValue as Value | undefined;
}
