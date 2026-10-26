import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { QuireKitAvatarFallbackSlotProps } from "../../components/avatar";
import Avatar from "./avatar.vue";
import AvatarGroup from "./avatar-group.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

describe("Avatar fallback slot", () => {
  it("keeps the named slot stable while providing the person's name as data", async () => {
    let received: QuireKitAvatarFallbackSlotProps | undefined;
    const html = await renderToString(createSSRApp({
      render: () => h(Avatar, { name: "产品审阅", fallback: "产", size: "xs" }, {
        fallback: (props: QuireKitAvatarFallbackSlotProps) => {
          received = props;
          return h("span", { "data-custom-avatar": "reviewer" }, props.fallback);
        }
      })
    }));
    expect(received).toMatchObject({ name: "产品审阅", fallback: "产" });
    expect(html).toContain('<span data-custom-avatar="reviewer">产</span>');
    expect(html).toContain('aria-label="产品审阅"');
  });

  it("still renders computed initials when no slot is provided", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Avatar, { name: "Ada Lovelace" })
    }));
    expect(html).toContain("AL");
    expect(html).toContain('aria-label="Ada Lovelace"');
  });

  it("names status, group and overflow in the active language", async () => {
    const items = ["Ada", "Grace", "Linus"].map(name => ({ id: name, name, status: "online" as const }));
    const english = await renderToString(createSSRApp({
      render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(AvatarGroup, { items, max: 2 }))
    }));
    expect(english).toContain('aria-label="Members"');
    expect(english).toContain('aria-label="Ada, Online"');
    expect(english).toContain('aria-label="1 more member"');
    expect(english).not.toMatch(/[\p{Script=Han}]/u);
    const chinese = await renderToString(createSSRApp({ render: () => h(AvatarGroup, { items, max: 1 }) }));
    expect(chinese).toContain('aria-label="Ada，在线"');
    expect(chinese).toContain('aria-label="另有 2 位成员"');
  });
});
