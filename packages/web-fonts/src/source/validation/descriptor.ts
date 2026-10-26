import {
  QUIRE_FONT_SOURCE_PROTOCOL_V1,
  type QuireFontSourceAuthentication,
  type QuireFontSourceCapability,
  type QuireFontSourceDescriptor
} from "../types";
import {
  parseText,
  requireHttpsUrl,
  requireMatchingString,
  requireRecord,
  requireString,
  requireStringArray
} from "./shared";

const SOURCE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,126}[a-z0-9])?$/u;
const HEADER_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]{0,63}$/u;
const capabilities = new Set<QuireFontSourceCapability>([
  "browse",
  "search",
  "cursor-pagination",
  "resolve"
]);

/**
 * Validates one remote source descriptor and resolves its endpoint URLs.
 *
 * @param value - Unknown JSON response.
 * @param descriptorUrl - Absolute descriptor URL used for relative endpoints.
 * @returns Validated immutable descriptor.
 */
export function parseQuireFontSourceDescriptor(
  value: unknown,
  descriptorUrl: string
): QuireFontSourceDescriptor {
  const record = requireRecord(value, "font source descriptor");
  if (record.specVersion !== QUIRE_FONT_SOURCE_PROTOCOL_V1) {
    throw new TypeError(`Unsupported font source protocol "${String(record.specVersion)}".`);
  }
  const id = requireMatchingString(record.id, "source id", SOURCE_ID_PATTERN);
  if (!id.includes(".")) throw new TypeError("Font source id must use reverse-DNS form.");
  const declaredCapabilities = requireStringArray(record.capabilities, "capabilities");
  if (!declaredCapabilities.includes("browse") || !declaredCapabilities.includes("resolve")) {
    throw new TypeError("Font source must declare browse and resolve capabilities.");
  }
  if (declaredCapabilities.some((entry) => !capabilities.has(entry as QuireFontSourceCapability))) {
    throw new TypeError("Font source declares an unsupported capability.");
  }
  return Object.freeze({
    specVersion: QUIRE_FONT_SOURCE_PROTOCOL_V1,
    id,
    name: parseText(record.name, "source name"),
    ...(record.homepageUrl === undefined
      ? {}
      : { homepageUrl: requireHttpsUrl(record.homepageUrl, descriptorUrl, "homepage URL") }),
    catalogUrl: requireHttpsUrl(record.catalogUrl, descriptorUrl, "catalog URL"),
    resolveUrl: requireHttpsUrl(record.resolveUrl, descriptorUrl, "resolve URL"),
    capabilities: Object.freeze(declaredCapabilities as QuireFontSourceCapability[]),
    authentication: parseAuthentication(record.authentication)
  });
}

/**
 * Parses the supported no-auth or local-header auth description.
 *
 * @param value - Unknown authentication value.
 * @returns Valid source authentication descriptor.
 */
function parseAuthentication(value: unknown): QuireFontSourceAuthentication {
  const record = requireRecord(value, "source authentication");
  if (record.type === "none") return Object.freeze({ type: "none" });
  if (record.type !== "header") throw new TypeError("Unsupported source authentication type.");
  const headerName = requireMatchingString(record.headerName, "header name", HEADER_NAME_PATTERN);
  if (["cookie", "set-cookie", "proxy-authorization"].includes(headerName.toLowerCase())) {
    throw new TypeError(`Unsafe source authentication header "${headerName}".`);
  }
  const prefix = optionalHeaderPrefix(record.prefix);
  return Object.freeze({
    type: "header",
    settingKey: requireString(record.settingKey, "authentication setting key"),
    headerName,
    ...(prefix === undefined ? {} : { prefix }),
    label: parseText(record.label, "authentication label")
  });
}

/**
 * Reads one optional short authentication prefix while preserving spaces.
 *
 * @param value - Unknown optional prefix.
 * @returns Valid prefix or `undefined`.
 */
function optionalHeaderPrefix(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 32 || /[\r\n]/u.test(value)) {
    throw new TypeError("Invalid authentication header prefix.");
  }
  return value;
}
