import { Schema, TextSelection } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { createMountedRevealingTextActivator } from "./revealing-text-activation";

const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} } });
const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Body")])]);

/**
 * Creates a host whose activation succeeds once the given geometry revision arrives.
 *
 * @param readyAfter - Revisions needed before activation succeeds; 0 succeeds immediately.
 * @param reveals - Whether a page holds the target.
 * @returns Host spies and a revision trigger.
 */
function createHost(readyAfter: number, reveals = true) {
  const listeners = new Set<() => void>();
  let revisions = 0;
  const host = {
    activate: vi.fn(() => revisions >= readyAfter),
    reveal: vi.fn(() => reveals),
    onGeometryUpdate: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readDoc: () => doc,
    readSelection: vi.fn(() => TextSelection.create(doc, 1))
  };
  const commit = () => {
    revisions += 1;
    [...listeners].forEach((listener) => listener());
  };
  return { host, commit, listeners };
}

/** A position between the paragraph and the document end, outside main text. */
const storyTarget = { doc, anchor: 6, head: 6 };

describe("revealing text activation", () => {
  it("activates laid-out text without revealing", () => {
    const { host } = createHost(0);
    expect(createMountedRevealingTextActivator(host).activate(storyTarget)).toBe(true);
    expect(host.reveal).not.toHaveBeenCalled();
  });

  it("reveals an off-window story occurrence and activates it once its page renders", () => {
    const { host, commit, listeners } = createHost(2);
    expect(createMountedRevealingTextActivator(host).activate(storyTarget, { focus: false })).toBe(true);
    expect(host.reveal).toHaveBeenCalledWith(6);
    commit();
    commit();
    expect(host.activate).toHaveBeenLastCalledWith(storyTarget, { focus: false });
    expect(listeners.size).toBe(0);
  });

  it("rejects targets no page holds and main text that failed", () => {
    expect(createMountedRevealingTextActivator(createHost(1, false).host).activate(storyTarget)).toBe(false);
    const main = createHost(1);
    expect(createMountedRevealingTextActivator(main.host).activate({ doc, anchor: 2, head: 3 })).toBe(false);
    expect(main.host.reveal).not.toHaveBeenCalled();
  });

  it("gives up after a bounded number of revisions", () => {
    const { host, commit, listeners } = createHost(10);
    createMountedRevealingTextActivator(host).activate(storyTarget);
    commit();
    commit();
    commit();
    expect(listeners.size).toBe(0);
    expect(host.activate).toHaveBeenCalledTimes(4);
  });

  it("drops an off-window activation if the user moves the selection while it is revealing", () => {
    const { host, commit, listeners } = createHost(1);
    createMountedRevealingTextActivator(host).activate(storyTarget);
    host.readSelection.mockReturnValue(TextSelection.create(doc, 2));
    commit();
    expect(host.activate).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });

  it("does not miss geometry committed synchronously while revealing a cached page", () => {
    const { host, commit, listeners } = createHost(1);
    host.reveal.mockImplementation(() => { commit(); return true; });
    expect(createMountedRevealingTextActivator(host).activate(storyTarget)).toBe(true);
    expect(host.activate).toHaveBeenCalledTimes(2);
    expect(listeners.size).toBe(0);
  });
});
