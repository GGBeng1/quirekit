import { link } from "@quirekit/msfe-link";
import type { MdDocumentLinks } from "../../commands/types";
import type { MdEditorExtensionOptions } from "../../types";

type Features = NonNullable<MdEditorExtensionOptions["features"]>;

/**
 * Presents recognized document links as references, and resolves them through `exportUrl` on export, unless the
 * host configured the link feature itself.
 * @param features - Host feature overrides.
 * @param links - Host document links.
 * @returns Feature overrides with the reference-aware link feature.
 */
export function withDocumentReferences(features: Features | undefined, links: MdDocumentLinks | undefined): Features {
  const recognize = links?.recognize;
  if (!recognize || features?.link !== undefined) return features ?? {};
  const exportUrl = links.exportUrl;
  return { ...features, link: link({
    reference: url => recognize(url) ? "document" : null,
    ...(exportUrl ? { exportHref: (url: string) => recognize(url) ? exportUrl(url) : null } : {}),
  }) };
}
