import { describe, expect, it } from "vitest";
import { activityStoreChecks, versionStoreChecks } from "../conformance";
import { createMemoryActivityStore, createMemoryVersionStore } from ".";

describe("memory activity store conformance", () => {
  for (const rule of activityStoreChecks) it(rule.name, () => rule.run(environment => createMemoryActivityStore(environment)));
});
describe("memory version store conformance", () => {
  for (const rule of versionStoreChecks) it(rule.name, () => rule.run(environment => createMemoryVersionStore({ now: environment.now })));
});

describe("memory activity store retention option", () => {
  it("applies the policy after every append", async () => {
    const store = createMemoryActivityStore({ retention: { fullDays: 30, maxEvents: 3 } });
    for (let index = 0; index < 5; index++) await store.append([{ documentId: "d", epoch: "e", operationId: `o${index}`, actor: { id: "u", trust: "local" }, source: "human", kind: "text.edit", kindVersion: 1, facts: {} }]);
    expect(store.snapshot("d").map(event => event.operationId)).toEqual(["o2", "o3", "o4"]);
  });
});
