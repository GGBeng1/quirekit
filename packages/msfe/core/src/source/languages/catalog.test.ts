import { describe, expect, it } from "vitest";
import { LanguageSupport, StreamLanguage } from "@quirekit/cm-language";
import { codeLanguageCatalog } from "./catalog";

const support = new LanguageSupport(StreamLanguage.define({ token(stream) { stream.skipToEnd(); return null; } }));

describe("lazy code language ownership", () => {
  it("matches exact case-insensitive aliases, loads once and leaves unknown names alone", async () => {
    let loads = 0;
    const catalog = codeLanguageCatalog([{ name: "TypeScript", aliases: ["ts"], load: async () => { loads++; return support; } }], new AbortController().signal, () => {});
    expect(loads).toBe(0);
    expect(catalog("typescript-extra")).toBeNull();
    expect(catalog("TS")).toBe(catalog("typescript"));
    await Promise.all([catalog("ts")!.load(), catalog("TypeScript")!.load()]);
    expect(loads).toBe(1);
  });
  it("recovers a failed loader without retry storms, and suppresses late results after disposal", async () => {
    const errors: unknown[] = [];
    const failed = codeLanguageCatalog([{ name: "bad", load: async () => { throw new Error("offline"); } }], new AbortController().signal, error => errors.push(error));
    const fallback = await failed("bad")!.load();
    expect(fallback).toBe(await failed("bad")!.load());
    expect(errors).toHaveLength(1);
    const abort = new AbortController();
    let finish!: (value: LanguageSupport) => void;
    const delayed = codeLanguageCatalog([{ name: "late", load: () => new Promise(resolve => { finish = resolve; }) }], abort.signal, error => errors.push(error));
    const pending = delayed("late")!.load();
    await Promise.resolve(); abort.abort(); finish(support);
    expect(await pending).not.toBe(support);
    expect(errors).toHaveLength(1);
  });
  it("keeps loader lifetimes independent when two editors share a host catalog", async () => {
    let calls = 0;
    const entries = [{ name: "shared", load: async () => { calls++; return support; } }];
    const first = new AbortController(), second = new AbortController();
    const a = codeLanguageCatalog(entries, first.signal, () => {}), b = codeLanguageCatalog(entries, second.signal, () => {});
    first.abort();
    expect(await a("shared")!.load()).not.toBe(support);
    expect(await b("shared")!.load()).toBe(support);
    expect(calls).toBe(1);
  });
});
