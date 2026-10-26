import { ofdXmlElement, renderOFDXmlDocument } from "../xml";
import type { OFDAssignedPage } from "./types";

/**
 * Compiles exactly one physical page's optional local resource file.
 *
 * @param page - Assigned physical page with local image resources.
 * @returns Complete `PageRes.xml` document.
 */
export function createOFDPageResourcesXml(page: OFDAssignedPage): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:Res", {
    "xmlns:ofd": "http://www.ofdspec.org/2016",
    BaseLoc: "Res"
  }, [ofdXmlElement("ofd:MultiMedias", {}, page.pageImages.map((image) =>
    ofdXmlElement("ofd:MultiMedia", {
      ID: image.id,
      Type: "Image",
      Format: image.source.format
    }, [ofdXmlElement("ofd:MediaFile", {}, [image.relativePath])])
  ))]));
}
