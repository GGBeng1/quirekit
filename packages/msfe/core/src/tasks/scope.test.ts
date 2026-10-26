import { expect, it } from "vitest";
import { TaskScope } from "./scope";
import type { ResourceLease } from "./types";

it("cancels descendants, ignores late values and releases each lease exactly once", async () => {
  const scope = new TaskScope(error => { throw error; });
  let resolve!: (value: ResourceLease<string>) => void;
  let releases = 0, accepted = 0;
  const promise = new Promise<ResourceLease<string>>(done => { resolve = done; });
  const request = scope.acquire(() => promise, () => { accepted++; });
  await Promise.resolve(); scope.dispose();
  expect(request.signal.aborted).toBe(true);
  resolve({ value: "late", release: () => { releases++; } });
  await promise; await Promise.resolve(); await Promise.resolve();
  scope.dispose(); request.dispose();
  expect(releases).toBe(1); expect(accepted).toBe(0);
});

it("retains document work across view cancellation and finalizes in reverse order despite cleanup errors", async () => {
  const order: string[] = [], errors: unknown[] = [];
  const editor = new TaskScope(error => { errors.push(error); }), document = editor.fork(), view = document.fork();
  document.own(() => { order.push("document"); });
  view.own(() => { order.push("first"); });
  view.own(() => { order.push("second"); throw new Error("cleanup"); });
  view.dispose(); expect(document.disposed).toBe(false);
  let accepted = false;
  document.acquire(() => ({ value: true, release: () => { order.push("resource"); } }), value => { accepted = value; });
  await Promise.resolve(); await Promise.resolve();
  expect(accepted).toBe(true); editor.dispose();
  expect(order).toEqual(["second", "first", "resource", "document"]); expect(errors).toHaveLength(1);
});
