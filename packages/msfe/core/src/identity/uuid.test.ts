// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createMsfeEditor } from "../editor/create";
import type { MsfeEditor } from "../editor/types";
import { createSourceIdentity } from "./uuid";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("allocates distinct UUID v4 values without secure-context randomUUID", () => {
  vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  const first = createSourceIdentity(), second = createSourceIdentity();
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(second).not.toBe(first);
});

it("mounts isolated editors and captures source targets without secure-context randomUUID", () => {
  vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  const parents = [document.createElement("div"), document.createElement("div")];
  document.body.append(...parents);
  for (const parent of parents) editors.push(createMsfeEditor({ parent, markdown: "hello" }));
  expect(editors[0]!.documentId).not.toBe(editors[1]!.documentId);
  expect(editors[0]!.captureTarget().instanceId).not.toBe(editors[1]!.captureTarget().instanceId);
  const anchor = editors[0]!.captureAnchor({ from: 1, to: 4 });
  expect(anchor.target()?.selection.main).toMatchObject({ from: 1, to: 4 });
  anchor.release(); expect(anchor.target()).toBeNull();
  expect(editors[0]!.getMarkdown()).toBe("hello");
});
