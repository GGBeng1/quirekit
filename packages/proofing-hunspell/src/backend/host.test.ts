import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHunspellWordEngine } from "../engine";
import type { HunspellBackend, HunspellDictionaryLoader } from "../types";
import { HunspellWorkerHost, type HunspellWorkerEndpoint } from "./host";
import { createInlineHunspellBackend } from "./inline";
import { createWorkerHunspellBackend } from "./worker-client";

/**
 * Reads a bundled dictionary from disk.
 *
 * @param name - Dictionary file name without extension.
 * @returns Loader.
 */
function bundled(name: string): HunspellDictionaryLoader {
  return async () => ({
    aff: await readFile(new URL(`../../dictionaries/${name}.aff`, import.meta.url), "utf8"),
    dic: await readFile(new URL(`../../dictionaries/${name}.dic`, import.meta.url), "utf8")
  });
}

const ports: MessagePort[] = [];
const signal = new AbortController().signal;

afterEach(() => {
  for (const port of ports.splice(0)) port.close();
});

/**
 * Connects one simulated tab to a host over a message channel.
 *
 * @param host - Shared worker host.
 * @returns Client backend of the tab.
 */
function connect(host: HunspellWorkerHost): HunspellBackend {
  return createWorkerHunspellBackend(connectAsWorker(host));
}

describe("Hunspell worker host", () => {
  it("lets a second tab reuse a loaded dictionary without downloading it", async () => {
    const host = new HunspellWorkerHost(createInlineHunspellBackend());
    const loader = vi.fn(bundled("en-US"));
    const first = createHunspellWordEngine({ dictionaries: { "en-US": loader }, createWorker: () => connectAsWorker(host) });
    const second = createHunspellWordEngine({ dictionaries: { "en-US": loader }, createWorker: () => connectAsWorker(host) });

    expect(await first.isCorrect(["teh", "the"], "en-US", signal)).toEqual([false, true]);
    expect(await second.isCorrect(["teh"], "en-US", signal)).toEqual([false]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("applies the union of every tab's user words", async () => {
    const host = new HunspellWorkerHost(createInlineHunspellBackend());
    const first = connect(host);
    const second = connect(host);
    await first.load("en-US", await bundled("en-US")());
    await first.setUserWords(["QuireKit"]);
    await second.setUserWords(["Wordly"]);

    expect(await first.check("en-US", ["QuireKit", "Wordly"])).toEqual([true, true]);
    await second.setUserWords([]);
    expect(await first.check("en-US", ["QuireKit", "Wordly"])).toEqual([true, false]);
  });

  it("reloads a dictionary the shared worker evicted and retries the lookup", async () => {
    const host = new HunspellWorkerHost(createInlineHunspellBackend(1));
    const engine = createHunspellWordEngine({
      dictionaries: { "en-US": bundled("en-US"), "en-GB": bundled("en-GB") },
      createWorker: () => connectAsWorker(host)
    });
    const other = connect(host);

    expect(await engine.isCorrect(["color"], "en-US", signal)).toEqual([true]);
    await other.load("en-GB", await bundled("en-GB")());
    expect(await engine.isCorrect(["color"], "en-US", signal)).toEqual([true]);
    expect(await engine.isCorrect(["colour", "color"], "en-GB", signal)).toEqual([true, false]);
  });
});

/**
 * Connects a simulated tab and returns its end as a worker.
 *
 * @param host - Shared worker host.
 * @returns Port typed as a worker.
 */
function connectAsWorker(host: HunspellWorkerHost): Worker {
  const channel = new MessageChannel();
  ports.push(channel.port1, channel.port2);
  host.serve(channel.port1 as unknown as HunspellWorkerEndpoint);
  channel.port1.start();
  channel.port2.start();
  return channel.port2 as unknown as Worker;
}
