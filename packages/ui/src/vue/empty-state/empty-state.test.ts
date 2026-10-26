import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import EmptyState from "./empty-state.vue";

describe("EmptyState text semantics", () => {
  it("uses a paragraph by default and permits description-only content", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(EmptyState, {
      id: "empty", description: "No matches"
    }) }));
    expect(html).toContain('aria-labelledby="empty-description"');
    expect(html).not.toContain('id="empty-title"');
    expect(html).not.toContain("<h3");
    expect(html).not.toContain("aria-describedby");
    expect(html).toContain("No matches");
  });

  it("keeps explicit heading semantics and description associations", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(EmptyState, {
      id: "empty", title: "No records", description: "Try another filter", headingLevel: 4
    }) }));
    expect(html).toMatch(/<h4\b[^>]*id="empty-title"/u);
    expect(html).toContain('aria-labelledby="empty-title"');
    expect(html).toContain('aria-describedby="empty-description"');
  });

  it("omits empty copy containers and uses title slots without phantom headings", async () => {
    const blank = await renderToString(createSSRApp({ render: () => h(EmptyState, { label: "Empty" }) }));
    expect(blank).not.toContain("qk-empty-state__copy");
    expect(blank).not.toContain("aria-labelledby");
    const slotted = await renderToString(createSSRApp({ render: () => h(EmptyState, { id: "slot" }, {
      title: () => "Slot title"
    }) }));
    expect(slotted).toMatch(/<p\b[^>]*id="slot-title"/u);
    expect(slotted).toContain('aria-labelledby="slot-title"');
  });
});
