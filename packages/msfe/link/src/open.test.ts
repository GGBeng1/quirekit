// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { linkOpeningPolicy, openLinkDestination } from "./open";

afterEach(() => vi.restoreAllMocks());

it("shares one safe host policy while rejecting unsafe destinations", () => {
  const open = vi.fn(), state = EditorState.create({ extensions: [linkOpeningPolicy.of(open)] });
  expect(openLinkDestination(state, document, "/guide")).toBe(true);
  expect(openLinkDestination(state, document, "javascript:alert(1)")).toBe(false);
  expect(open).toHaveBeenCalledExactlyOnceWith("/guide");
});

it("uses the owning window without treating noopener's null as failure", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  expect(openLinkDestination(EditorState.create(), document, "#part")).toBe(true);
  expect(open).toHaveBeenCalledExactlyOnceWith("#part", "_blank", "noopener,noreferrer");
});
