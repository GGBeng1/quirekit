import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { effectScope, isProxy, isReadonly, shallowRef, watch } from "vue";
import { TaskScope, type MsfeEditor, type StateSubscription } from "@quirekit/msfe-core";
import { StateSubscriptions } from "../../core/src/state/authoring/subscriptions";
import { useMsfeState } from "./state";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

/** @param length - Selected field. @returns An opaque accepted snapshot; no editor or parser runs in this adapter fixture. */
function snapshot(length: number): MsfeEditor["state"] {
  return Object.freeze({ doc: Object.freeze({ length }) }) as MsfeEditor["state"];
}

/** @param length - Initial selected field. @returns The core publisher with controlled accepted snapshots and a real resource lifetime. */
function fixture(length = 3) {
  let state = snapshot(length);
  const scope = new TaskScope(), subscriptions = new StateSubscriptions(error => { throw error; });
  const unsubscribe = vi.fn();
  const editor = { scope, get state() { return state; },
    /** @param subscription - Vue adapter observer. @returns Instrumented core unsubscribe. */
    subscribeState<T>(subscription: StateSubscription<T>): () => void {
      const release = subscriptions.add(state, subscription);
      return () => { unsubscribe(); release(); };
    },
  } as MsfeEditor;
  cleanups.push(() => { subscriptions.clear(); scope.dispose(); });
  return { editor, unsubscribe,
    /** @param next - Accepted replacement, independent of how a transaction was created. */
    publish(next: MsfeEditor["state"]): void { state = next; subscriptions.publish(next); },
  };
}

/** @param setup - Vue consumer setup. @returns Its value and disposable Vue effect scope. */
function consumer<T>(setup: () => T) {
  const scope = effectScope(); cleanups.push(() => scope.stop());
  return { value: scope.run(setup)!, stop: () => scope.stop() };
}

describe("Vue accepted-state subscription", () => {
  it("waits for an instance and keeps exact shallow snapshots synchronously", () => {
    const source = shallowRef<MsfeEditor>();
    const { value: state } = consumer(() => useMsfeState(source));
    expect(state.value).toBeUndefined(); expect(isReadonly(state)).toBe(true);
    const instance = fixture(); source.value = instance.editor;
    expect(state.value).toBe(instance.editor.state); expect(isProxy(state.value)).toBe(false);
    const next = snapshot(4); instance.publish(next);
    expect(state.value).toBe(next);
    expectTypeOf(state.value).toEqualTypeOf<MsfeEditor["state"] | undefined>();
  });

  it("publishes selected values only when they change, with one bounded read per accepted update", () => {
    const instance = fixture(), select = vi.fn((state: MsfeEditor["state"]) => state.doc.length);
    const changed = vi.fn();
    const { value } = consumer(() => {
      const length = useMsfeState(instance.editor, { select });
      watch(length, changed, { flush: "sync" }); return length;
    });
    expectTypeOf(value.value).toEqualTypeOf<number | undefined>();
    const initialReads = select.mock.calls.length;
    instance.publish(snapshot(3)); instance.publish(snapshot(3)); instance.publish(snapshot(4));
    expect(select).toHaveBeenCalledTimes(initialReads + 3);
    expect(changed).toHaveBeenCalledTimes(1); expect(value.value).toBe(4);
  });

  it("uses the caller's equality for object projections", () => {
    const instance = fixture();
    const { value } = consumer(() => useMsfeState(instance.editor, {
      select: state => ({ length: state.doc.length }), equal: (a, b) => a.length === b.length,
    }));
    const first = value.value;
    instance.publish(snapshot(3)); expect(value.value).toBe(first);
    instance.publish(snapshot(7)); expect(value.value).toEqual({ length: 7 });
  });

  it("detaches the old editor before a getter switches instances or becomes empty", () => {
    const first = fixture(), second = fixture(8);
    const current = shallowRef<MsfeEditor | null>(first.editor);
    const { value } = consumer(() => useMsfeState(() => current.value));
    current.value = second.editor;
    expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    first.publish(snapshot(99)); first.editor.scope.dispose();
    expect(value.value).toBe(second.editor.state);
    current.value = null;
    expect(value.value).toBeUndefined(); expect(second.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("stops all selector work on Vue disposal and prevents later reattachment", () => {
    const instance = fixture(), source = shallowRef<MsfeEditor | undefined>(instance.editor);
    const select = vi.fn((state: MsfeEditor["state"]) => state.doc.length);
    const { value, stop } = consumer(() => useMsfeState(source, { select }));
    stop(); stop();
    const reads = select.mock.calls.length;
    expect(value.value).toBeUndefined(); expect(instance.unsubscribe).toHaveBeenCalledTimes(1);
    instance.publish(snapshot(10)); source.value = fixture(20).editor;
    expect(select).toHaveBeenCalledTimes(reads); expect(value.value).toBeUndefined();
  });

  it("clears a destroyed instance without waiting for Vue to replace its ref", () => {
    const instance = fixture();
    const { value, stop } = consumer(() => useMsfeState(instance.editor));
    instance.editor.scope.dispose(); stop();
    expect(value.value).toBeUndefined(); expect(instance.unsubscribe).toHaveBeenCalledTimes(1);
    instance.publish(snapshot(10)); expect(value.value).toBeUndefined();
  });

  it("never reads an already disposed instance or a missing SSR instance", () => {
    const instance = fixture(); instance.editor.scope.dispose();
    const select = vi.fn((state: MsfeEditor["state"]) => state.doc.length);
    const { value } = consumer(() => [useMsfeState(instance.editor, { select }), useMsfeState(undefined, { select })]);
    expect(value.map(result => result.value)).toEqual([undefined, undefined]);
    expect(select).not.toHaveBeenCalled();
  });
});
