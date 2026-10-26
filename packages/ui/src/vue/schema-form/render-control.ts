import { h } from "vue";
import type { VNode } from "vue";
import type { QuireKitSchemaFieldSlotProps, QuireKitSchemaRegistry } from "./types";
import { schemaControls } from "./controls/registry";

/** Projects the canonical field binding onto an explicit component adapter.
 * @param slot - Registered field context and its original definition.
 * @param registry - Consumer-local component allowlist.
 * @returns Bound input VNode.
 */
export function renderSchemaControl(slot: QuireKitSchemaFieldSlotProps, registry: QuireKitSchemaRegistry): VNode {
  const field = slot.field;
  const adapter = (Object.hasOwn(registry, field.control) ? registry[field.control] : undefined)
    ?? (Object.hasOwn(schemaControls, field.control) ? schemaControls[field.control] : undefined);
  if (!adapter) throw new Error(`Unknown QuireSchemaForm control "${field.control}" for "${field.name}". Register it or provide a field slot.`);
  const { modelValue, "onUpdate:modelValue": update, width, ...association } = slot.controlProps;
  const event = adapter.updateEvent ?? "update:modelValue";
  const model = adapter.modelProp ?? "modelValue";
  return h(adapter.component, {
    width: width ?? "100%", label: field.label,
    ...(field.control === "switch" ? { kind: "switch" } : {}),
    ...field.props, ...association,
    [model]: adapter.toControl ? adapter.toControl(modelValue) : modelValue,
    [`on${event[0]?.toUpperCase()}${event.slice(1)}`]: (value: unknown) => {
      try { update(adapter.fromControl ? adapter.fromControl(value) : value); }
      catch (error) { slot.form.reportError(error); }
    }
  });
}
