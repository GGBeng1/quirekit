import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import Form from "./form.vue";
import FormField from "../form-field/form-field.vue";
import SchemaForm from "../schema-form/schema-form.vue";
import type { QuireKitFormFieldSlotProps } from "../form-field/types";
import type { QuireKitSchemaNode } from "../schema-form/types";

describe("form server rendering", () => {
  it("renders handwritten fields and metadata without executing asynchronous rules", async () => {
    const rules = vi.fn(async () => true);
    const app = createSSRApp({ render: () => h(Form, { initialValues: { name: "Server draft" } }, {
      default: (state: { meta: { dirty: boolean } }) => [
        h("p", String(state.meta.dirty)),
        h(FormField, { name: "name", label: "Name", required: true, rules }, {
          default: (field: QuireKitFormFieldSlotProps) => h("input", { id: field.controlProps.id, value: field.value })
        })
      ]
    }) });
    const html = await renderToString(app);
    expect(html).toContain("Server draft");
    expect(html).toContain("<form");
    expect(rules).not.toHaveBeenCalled();
  });

  it("renders all six configured control families and groups in independent SSR requests", async () => {
    const fields: QuireKitSchemaNode[] = [{ key: "settings", legend: "Settings", children: [
      { name: "title", label: "Title", control: "input", required: true },
      { name: "summary", label: "Summary", control: "textarea" },
      { name: "count", label: "Count", control: "number" },
      { name: "mode", label: "Mode", control: "select", props: { items: [{ value: "draft", label: "Draft" }] } },
      { name: "agree", label: "Agree", control: "checkbox" },
      { name: "enabled", label: "Enabled", control: "switch" },
      { name: "hidden", label: "Hidden field", control: "input", visible: values => values.enabled === true }
    ] }];
    for (let request = 0; request < 3; request++) {
      const app = createSSRApp({ render: () => h(SchemaForm, {
        fields, initialValues: { title: "Server draft", summary: "Summary", count: "3", mode: "draft", agree: false, enabled: false }
      }) });
      const html = await renderToString(app);
      expect(html).toContain("<fieldset");
      expect(html).toContain("Server draft");
      expect(html.match(/data-form-field=/g)).toHaveLength(6);
      expect(html).not.toContain("Hidden field");
    }
  });
});
