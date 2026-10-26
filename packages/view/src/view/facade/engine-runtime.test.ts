import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  createQuireViewEngineRuntime
} from "@quirekit/view-engine";
import {
  registerQuireViewEngineRuntime,
  requireQuireViewEngineRuntime
} from "./engine-runtime";

describe("QuireView Engine runtime bridge", () => {
  it("shares one opaque Engine runtime without exposing cache fields", () => {
    const editor = createEditor({ extensions: [StarterKit] });
    const view = {};
    const runtime = createQuireViewEngineRuntime({ editor });

    registerQuireViewEngineRuntime(view, runtime);

    expect(requireQuireViewEngineRuntime(view)).toBe(runtime);
    expect(runtime).not.toHaveProperty("accepted");
    expect(view).not.toHaveProperty("blockShapeCache");
  });

  it("rejects missing and duplicate runtime registration", () => {
    const editor = createEditor({ extensions: [StarterKit] });
    const view = {};
    const runtime = createQuireViewEngineRuntime({ editor });

    expect(() => requireQuireViewEngineRuntime(view)).toThrow(/not registered/u);
    registerQuireViewEngineRuntime(view, runtime);
    expect(() => registerQuireViewEngineRuntime(view, runtime)).toThrow(
      /already registered/u
    );
  });
});
