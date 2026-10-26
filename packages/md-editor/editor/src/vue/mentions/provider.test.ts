import { describe, expect, it } from "vitest";
import { resolveMdMentions } from "./provider";

describe("host contact boundary", () => {
  it("filters static contacts and rejects unsafe, duplicate identities", async () => {
    const contacts = [
      { id: "lin", label: "小林", url: "/lin", description: "Design" },
      { id: "lin", label: "Duplicate", url: "/duplicate" },
      { id: "bad", label: "Bad", url: "javascript:bad" },
    ];
    const request = { query: "DESIGN", signal: new AbortController().signal };
    expect((await resolveMdMentions(contacts, request)).map(item => item.id)).toEqual(["lin"]);
    expect((await resolveMdMentions(contacts, { ...request, query: "" })).map(item => item.url)).toEqual(["/lin"]);
  });
  it("drops late completions after cancellation without rewriting provider aliases", async () => {
    const controller = new AbortController();
    const lookup = async () => { controller.abort(); return [{ id: "lin", label: "Lin", url: "/lin" }]; };
    expect(await resolveMdMentions(lookup, { query: "designer", signal: controller.signal })).toEqual([]);
    expect(await resolveMdMentions(() => [{ id: "lin", label: "Lin", url: "/lin" }], {
      query: "designer", signal: new AbortController().signal,
    })).toHaveLength(1);
  });
});
