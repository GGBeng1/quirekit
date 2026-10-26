import {
  ofdXmlElement,
  renderOFDXmlDocument
} from "../xml";
import { formatOFDBox } from "./format";
import { compileOFDPageBlockChild } from "./page-block";
import { compileOFDActions } from "./action";
import type {
  OFDAssignedDocument,
  OFDAssignedPage,
  OFDAssignedTemplatePage
} from "./types";

/**
 * Compiles one assigned page into `Content.xml`.
 *
 * @param page - Assigned page.
 * @param document - Assigned document.
 * @returns Complete page XML.
 */
export function createOFDPageXml(
  page: OFDAssignedPage | OFDAssignedTemplatePage,
  document: OFDAssignedDocument
): string {
  const area = {
    x: 0,
    y: 0,
    width: page.source.options.width,
    height: page.source.options.height
  };
  const templates = "templates" in page.source
    ? page.source.templates.map((reference) => {
        const template = document.templates.find((candidate) =>
          candidate.source.templateIdentity === reference.templateIdentity
        );
        if (!template) {
          throw new TypeError("Page references an unknown OFD template.");
        }
        return ofdXmlElement("ofd:Template", {
          TemplateID: template.id,
          ZOrder: reference.options.zOrder
        });
      })
    : [];
  return renderOFDXmlDocument(ofdXmlElement("ofd:Page", {
    "xmlns:ofd": "http://www.ofdspec.org/2016"
  }, [
    // Page.xsd requires all reusable template references before the page area.
    ...templates,
    ofdXmlElement("ofd:Area", {}, [
      ofdXmlElement("ofd:PhysicalBox", {}, [formatOFDBox(area)])
    ]),
    ...("pageResourceDocumentLocation" in page && page.pageResourceDocumentLocation
      ? [ofdXmlElement("ofd:PageRes", {}, [page.pageResourceDocumentLocation])]
      : []),
    ofdXmlElement("ofd:Content", {}, page.layers.map((layer) =>
      ofdXmlElement("ofd:Layer", {
        ID: layer.id,
        Type: layer.source.options.type ?? "Body"
      }, layer.objects.map((child) =>
        compileOFDPageBlockChild(child, document)
      ))
    )),
    ...("actions" in page.source
      ? [compileOFDActions(document, page.source.actions, "PO")]
          .filter((action): action is NonNullable<typeof action> => action !== undefined)
      : [])
  ]));
}
