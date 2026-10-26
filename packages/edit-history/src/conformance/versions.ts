import type { PendingVersion } from "../protocol/types";
import { check, environment } from "./fixtures";
import type { VersionStoreCheck } from "./types";

const day = 86_400_000, hour = 3_600_000;
const base: PendingVersion = { documentId: "doc-1", epoch: "e1", sequence: 1, trigger: "auto" };
const markdown = (value: string) => ({ format: "markdown", value });

/** Protocol rules every version store must satisfy. */
export const versionStoreChecks: readonly VersionStoreCheck[] = [
  { name: "reuses an unchanged automatic version and keeps named ones", async run(create) {
    const store = await create(environment());
    const first = await store.create(base, markdown("# A"));
    const repeat = await store.create({ ...base, sequence: 2 }, markdown("# A"));
    const named = await store.create({ ...base, sequence: 3, trigger: "named", name: "v1" }, markdown("# A"));
    check(repeat.id === first.id, "an unchanged automatic version is reused");
    check(named.id !== first.id && named.content.hash === first.content.hash, "named versions are always created and share the hash");
  } },
  { name: "reads content and lists newest first", async run(create) {
    const store = await create(environment());
    const ids = [];
    for (const value of ["one", "two", "three"]) ids.push((await store.create(base, markdown(value))).id);
    const first = await store.list({ documentId: "doc-1", limit: 2 });
    const second = await store.list({ documentId: "doc-1", limit: 2, cursor: first.cursor! });
    check([...first.items, ...second.items].map(item => item.id).join() === ids.reverse().join(), "versions are listed newest first across pages");
    const read = await store.read(ids[0]!);
    check(read?.content.value === "three" && read.record.content.bytes === 5, "content and size are returned");
  } },
  { name: "thins old automatic versions and keeps named ones", async run(create) {
    const env = environment(Date.parse("2026-10-01T00:00:00.000Z")), store = await create(env);
    if (!store.compact) return;
    for (let index = 0; index < 4; index++) { await store.create(base, markdown(`draft ${index}`)); env.advance(hour); }
    await store.create({ ...base, trigger: "named", name: "kept" }, markdown("named"));
    env.advance(10 * day);
    const report = await store.compact({ fullDays: 30, versionThinning: [{ olderThanDays: 7, keepEveryHours: 24 }] }, env.now());
    const left = (await store.list({ documentId: "doc-1", limit: 10 })).items;
    check(report.versionsRemoved === 3, "automatic versions in one day collapse to one");
    check(left.some(item => item.name === "kept") && left.length === 2, "named versions are kept");
  } },
];
