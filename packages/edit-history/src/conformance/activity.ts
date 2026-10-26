import type { ActivityEvent, ActivityStore } from "../protocol/types";
import { check, environment, pending, rejects } from "./fixtures";
import type { ActivityStoreCheck } from "./types";

const day = 86_400_000;

/** @param store - Store under test. @param query - Listing parameters. @returns Every page concatenated. */
async function listAll(store: ActivityStore, query: Parameters<ActivityStore["list"]>[0]): Promise<ActivityEvent[]> {
  const items: ActivityEvent[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list({ ...query, ...(cursor ? { cursor } : {}) });
    items.push(...page.items); cursor = page.cursor;
  } while (cursor);
  return items;
}

/** Protocol rules every activity store must satisfy. */
export const activityStoreChecks: readonly ActivityStoreCheck[] = [
  { name: "assigns gap-free increasing sequences per document", async run(create) {
    const store = await create(environment());
    const receipts = await store.append([pending("a"), pending("b"), pending("c", { documentId: "doc-2" }), pending("d")]);
    check(receipts.map(item => item.sequence).join() === "1,2,1,3", "sequences start at 1 and increase without gaps within each document");
    check(new Set(receipts.map(item => item.id)).size === 4, "event identities are unique");
  } },
  { name: "is idempotent per operationId", async run(create) {
    const store = await create(environment());
    const [first] = await store.append([pending("same")]);
    const [again] = await store.append([pending("same", { facts: { changed: true } })]);
    check(again!.duplicate && !first!.duplicate, "a repeated operation reports a duplicate");
    check(again!.id === first!.id && again!.sequence === first!.sequence, "the original receipt is returned");
    check((await listAll(store, { documentId: "doc-1", limit: 10 })).length === 1, "no new event is created");
  } },
  { name: "rejects invalid events without a partial append", async run(create) {
    const store = await create(environment());
    await rejects(() => store.append([pending("ok"), { ...pending("bad"), kind: "Not A Kind" }]), "invalid kinds are rejected");
    check((await listAll(store, { documentId: "doc-1", limit: 10 })).length === 0, "the valid part of a rejected batch is not stored");
  } },
  { name: "confirms acceptance time and full retention", async run(create) {
    const env = environment(), store = await create(env);
    await store.append([pending("a")]);
    const [event] = (await store.list({ documentId: "doc-1", limit: 1 })).items;
    check(event!.formatVersion === 1 && event!.retention === "full", "new events use format 1 and full retention");
    check(event!.acceptedAt === env.now().toISOString(), "acceptance time comes from the store clock");
  } },
  { name: "lists newest first with stable pages while events arrive", async run(create) {
    const store = await create(environment());
    await store.append(Array.from({ length: 5 }, (_, index) => pending(`op-${index}`)));
    const first = await store.list({ documentId: "doc-1", limit: 2 });
    await store.append([pending("late")]);
    const second = await store.list({ documentId: "doc-1", limit: 2, cursor: first.cursor! });
    const third = await store.list({ documentId: "doc-1", limit: 2, cursor: second.cursor! });
    const sequences = [...first.items, ...second.items, ...third.items].map(item => item.sequence);
    check(sequences.join() === "5,4,3,2,1", "pages neither repeat nor skip events and exclude events newer than the first page");
    check(third.cursor === undefined, "the last page has no continuation");
    check((await store.list({ documentId: "doc-1", limit: 1 })).items[0]!.operationId === "late", "a fresh listing sees new events");
  } },
  { name: "rejects a cursor reused with another filter", async run(create) {
    const store = await create(environment());
    await store.append([pending("a"), pending("b")]);
    const page = await store.list({ documentId: "doc-1", limit: 1 });
    await rejects(() => store.list({ documentId: "doc-1", limit: 1, cursor: page.cursor!, filter: { actors: ["bob"] } }), "a cursor belongs to its filter");
  } },
  { name: "filters by actor, kind namespace, source and system kinds", async run(create) {
    const store = await create(environment());
    await store.append([pending("a"), pending("b", { actor: { id: "bob", trust: "verified" }, kind: "comment.add" }),
      pending("c", { kind: "session.join", source: "system" }), pending("d", { source: "ai", kind: "md.insert.highlight" })]);
    const ops = async (filter: object) => (await listAll(store, { documentId: "doc-1", limit: 10, filter })).map(item => item.operationId).join();
    check(await ops({ actors: ["bob"] }) === "b", "actor filter");
    check(await ops({ kinds: ["comment"] }) === "b", "a kind namespace matches nested kinds");
    check(await ops({ kinds: ["md.insert"] }) === "d", "nested namespaces match");
    check(await ops({ sources: ["ai"] }) === "d", "source filter");
    check(await ops({ system: false }) === "d,b,a", "system kinds can be excluded");
  } },
  { name: "applies the access policy to lists and reads", async run(create) {
    const env = environment(), store = await create(env);
    const [, hidden] = await store.append([pending("a"), pending("b", { actor: { id: "bob", trust: "verified" } })]);
    env.denied.add("carol:bob");
    const seen = await listAll(store, { documentId: "doc-1", limit: 10, viewer: "carol" });
    check(seen.length === 1 && seen[0]!.actor.id === "alice", "hidden actors are not listed");
    check(await store.get(hidden!.id, "carol") === null, "hidden events cannot be read");
    check((await store.get(hidden!.id, "alice"))?.operationId === "b", "visible events can be read");
  } },
  { name: "keeps unknown kinds and facts unchanged", async run(create) {
    const store = await create(environment());
    const facts = { nested: { list: [1, "two", null] } };
    await store.append([pending("future", { kind: "future.feature", kindVersion: 9, facts, target: { scheme: "custom", value: { a: 1 } } })]);
    const [event] = (await store.list({ documentId: "doc-1", limit: 1 })).items;
    check(event!.kind === "future.feature" && event!.kindVersion === 9, "kind and version are kept");
    check(JSON.stringify(event!.facts) === JSON.stringify(facts) && JSON.stringify(event!.target) === '{"scheme":"custom","value":{"a":1}}', "facts and target are kept");
  } },
  { name: "compacts old content into summaries and removes expired events", async run(create) {
    const env = environment(), store = await create(env);
    if (!store.compact) return;
    await store.append([pending("old")]); env.advance(25 * day);
    await store.append([pending("middle")]); env.advance(35 * day);
    await store.append([pending("new")]);
    const report = await store.compact({ fullDays: 30, summaryDays: 50 }, env.now());
    const events = await listAll(store, { documentId: "doc-1", limit: 10 });
    check(report.removed === 1 && report.summarized === 1, "one event is removed and one summarized");
    check(events.map(item => item.operationId).join() === "new,middle", "expired events are removed");
    check(events[1]!.retention === "summary" && events[1]!.content === undefined && events[1]!.sequence === 2, "summaries drop content and keep identity");
    check(events[0]!.retention === "full" && events[0]!.content !== undefined, "recent events keep content");
    const [next] = await store.append([pending("after")]);
    check(next!.sequence === 4, "sequences are never reused after removal");
  } },
  { name: "keeps only the newest events per document under a count cap", async run(create) {
    const env = environment(), store = await create(env);
    if (!store.compact) return;
    await store.append([1, 2, 3, 4, 5].map(index => pending(`a${index}`)));
    await store.append([pending("b1", { documentId: "doc-2" })]);
    const report = await store.compact({ fullDays: 30, maxEvents: 2 }, env.now());
    check(report.removed === 3, "events over the cap are removed");
    check((await listAll(store, { documentId: "doc-1", limit: 10 })).map(item => item.operationId).join() === "a5,a4", "the newest events remain");
    check((await listAll(store, { documentId: "doc-2", limit: 10 })).length === 1, "the cap applies per document");
  } },
  { name: "notifies subscribers of later events only", async run(create) {
    const store = await create(environment());
    if (!store.subscribe) return;
    await store.append([pending("a")]);
    const seen: number[] = [];
    const stop = store.subscribe("doc-1", 1, event => seen.push(event.sequence));
    await store.append([pending("b"), pending("c", { documentId: "doc-2" })]);
    stop();
    await store.append([pending("d")]);
    check(seen.join() === "2", "only later events of the document arrive until unsubscribed");
  } },
];
