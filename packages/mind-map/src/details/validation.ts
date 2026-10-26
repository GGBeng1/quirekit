import { readRecord, readText } from "../model/validation";
import { readMindMapTopicImage } from "./image";
import type { MindMapTopicDetails, MindMapDetailsPatch, MindMapParsedUrl } from "./types";
const keys = ["link", "note", "marker", "image"];

/** @param input - Untrusted absolute destination. @returns Original permitted URL without implicit navigation. */
export function readMindMapLink(input: unknown): string {
  if (typeof input !== "string" || input.length > 2048 || !/^(?:https?:\/\/|mailto:)/iu.test(input)
    || /[\s\\\u0000-\u001f\u007f]/u.test(input)) throw new TypeError("link: expected an absolute http, https or mailto URL");
  const Url = (globalThis as unknown as { URL: new (value: string) => MindMapParsedUrl }).URL;
  let url: MindMapParsedUrl; try { url = new Url(input); } catch { throw new TypeError("link: expected an absolute URL"); }
  if (!["http:", "https:", "mailto:"].includes(url.protocol) || (url.protocol === "mailto:" ? !url.pathname : !url.hostname || !!url.username || !!url.password)) throw new TypeError("link: unsupported destination");
  return input;
}

/** @param input - Untrusted content fields. @returns Detached admitted properties only. */
export function readMindMapDetails(input: unknown): MindMapTopicDetails {
  const value = readRecord(input, keys, "details");
  if (value.marker !== undefined && !["priority-1", "priority-2", "priority-3"].includes(value.marker as string)) throw new TypeError("details.marker: unsupported marker");
  return Object.freeze({ ...(value.link !== undefined ? { link: readMindMapLink(value.link) } : {}),
    ...(value.note !== undefined ? { note: readText(value.note, "details.note") } : {}),
    ...(value.marker !== undefined ? { marker: value.marker as NonNullable<MindMapTopicDetails["marker"]> } : {}),
    ...(value.image !== undefined ? { image: readMindMapTopicImage(value.image) } : {}) });
}

/** @param input - Untrusted partial write. @returns Valid fields and explicit deletion intents. */
export function readMindMapDetailsPatch(input: unknown): MindMapDetailsPatch {
  const value = readRecord(input, keys, "details.patch");
  const live = Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null));
  const fields = readMindMapDetails(live);
  return Object.freeze({ ...fields, ...Object.fromEntries(Object.entries(value).filter(([, field]) => field === null)) });
}
