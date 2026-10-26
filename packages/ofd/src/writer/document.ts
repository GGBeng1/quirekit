import {
  ofdXmlElement,
  renderOFDXmlDocument,
  type OFDXmlElement
} from "../xml";
import type {
  OFDOutlineOptions,
  OFDPermissions,
  OFDViewerPreferences
} from "../document/types";
import { compileOFDActionDestination, compileOFDActions } from "./action";
import { formatOFDBox, formatOFDNumber } from "./format";
import type {
  OFDAssignedDocument,
  OFDAssignedPageBlockChild
} from "./types";
import { digestOFDText } from "../resources/digest";

/**
 * Compiles the package entry point.
 *
 * @param document - Assigned document.
 * @returns Complete `OFD.xml`.
 */
export function createOFDEntryXml(
  document: OFDAssignedDocument
): string {
  const metadata = document.source.metadata;
  const info: OFDXmlElement[] = [
    ofdXmlElement("ofd:DocID", {}, [resolveDocumentId(document)])
  ];
  appendText(info, "ofd:Title", metadata.title);
  appendText(info, "ofd:Author", metadata.author);
  appendText(info, "ofd:Subject", metadata.subject);
  appendText(info, "ofd:Creator", metadata.creator);
  appendText(info, "ofd:CreatorVersion", metadata.creatorVersion);
  appendText(info, "ofd:CreationDate", metadata.creationDate);
  appendText(info, "ofd:ModDate", metadata.modificationDate);
  appendText(info, "ofd:DocUsage", metadata.usage);
  if (metadata.keywords && metadata.keywords.length > 0) {
    info.push(ofdXmlElement("ofd:Keywords", {}, metadata.keywords.map((value) =>
      ofdXmlElement("ofd:Keyword", {}, [value])
    )));
  }
  if (document.source.customData.length > 0) {
    info.push(ofdXmlElement(
      "ofd:CustomDatas",
      {},
      document.source.customData.map((item) =>
        ofdXmlElement("ofd:CustomData", { Name: item.name }, [item.value])
      )
    ));
  }
  return renderOFDXmlDocument(ofdXmlElement("ofd:OFD", {
    "xmlns:ofd": "http://www.ofdspec.org/2016",
    Version: "1.0",
    DocType: "OFD"
  }, [
    ofdXmlElement("ofd:DocBody", {}, [
      ofdXmlElement("ofd:DocInfo", {}, info),
      ofdXmlElement("ofd:DocRoot", {}, ["Doc_0/Document.xml"])
    ])
  ]));
}

/**
 * Compiles the document root and page tree.
 *
 * @param document - Assigned document.
 * @returns Complete `Document.xml`.
 */
export function createOFDDocumentXml(
  document: OFDAssignedDocument
): string {
  const firstPage = document.pages[0]!;
  const commonData: OFDXmlElement[] = [
    ofdXmlElement("ofd:MaxUnitID", {}, [document.maximumId]),
    ofdXmlElement("ofd:PageArea", {}, [
      ofdXmlElement("ofd:PhysicalBox", {}, [formatOFDBox({
        x: 0,
        y: 0,
        width: firstPage.source.options.width,
        height: firstPage.source.options.height
      })])
    ])
  ];
  if (document.fonts.length > 0
    || document.colorSpaces.length > 0
    || document.drawParams.length > 0) {
    commonData.push(ofdXmlElement("ofd:PublicRes", {}, ["PublicRes.xml"]));
  }
  if (document.images.length > 0 || document.compositeGraphicUnits.length > 0) {
    commonData.push(ofdXmlElement("ofd:DocumentRes", {}, ["DocumentRes.xml"]));
  }
  commonData.push(...document.templates.map((template) =>
    ofdXmlElement("ofd:TemplatePage", {
      ID: template.id,
      Name: template.source.options.name,
      ZOrder: template.source.options.zOrder,
      BaseLoc: template.documentLocation
    })
  ));
  const children: OFDXmlElement[] = [
    ofdXmlElement("ofd:CommonData", {}, commonData),
    ofdXmlElement("ofd:Pages", {}, document.pages.map((page) =>
      ofdXmlElement("ofd:Page", {
        ID: page.id,
        BaseLoc: page.documentLocation
      })
    ))
  ];
  appendDocumentSemantics(children, document);
  return renderOFDXmlDocument(ofdXmlElement("ofd:Document", {
    "xmlns:ofd": "http://www.ofdspec.org/2016"
  }, children));
}

/**
 * Appends optional document semantics in standard order.
 *
 * @param children - Mutable document child sink.
 * @param document - Assigned document.
 */
function appendDocumentSemantics(
  children: OFDXmlElement[],
  document: OFDAssignedDocument
): void {
  if (document.source.outlines.length > 0) {
    children.push(ofdXmlElement(
      "ofd:Outlines",
      {},
      document.source.outlines.map((outline) =>
        compileOutline(document, outline)
      )
    ));
  }
  if (document.source.permissions) {
    children.push(compilePermissions(document.source.permissions));
  }
  const documentOpenActions = compileOFDActions(
    document,
    document.source.documentOpenActions,
    "DO"
  );
  if (documentOpenActions) children.push(documentOpenActions);
  if (document.source.viewerPreferences) {
    children.push(compileViewerPreferences(document.source.viewerPreferences));
  }
  if (document.source.bookmarks.length > 0) {
    children.push(ofdXmlElement(
      "ofd:Bookmarks",
      {},
      document.source.bookmarks.map((bookmark) =>
        ofdXmlElement("ofd:Bookmark", { Name: bookmark.name }, [
          compileOFDActionDestination(document, bookmark.destination)
        ])
      )
    ));
  }
  if (document.pages.some((page) => page.annotations.length > 0)) {
    children.push(ofdXmlElement("ofd:Annotations", {}, ["Annotations.xml"]));
  }
  if (document.attachments.length > 0) {
    children.push(ofdXmlElement(
      "ofd:Attachments",
      {},
      ["Attachments.xml"]
    ));
  }
}

/**
 * Compiles one outline node recursively.
 *
 * @param document - Assigned document.
 * @param outline - Outline node.
 * @returns OutlineElem element.
 */
function compileOutline(
  document: OFDAssignedDocument,
  outline: OFDOutlineOptions
): OFDXmlElement {
  const children: OFDXmlElement[] = [];
  const actions = [
    ...(outline.destination ? [{
      type: "goto" as const,
      destination: outline.destination
    }] : []),
    ...(outline.actions ?? [])
  ];
  const compiledActions = compileOFDActions(document, actions, "CLICK");
  if (compiledActions) children.push(compiledActions);
  children.push(...(outline.children ?? []).map((child) =>
    compileOutline(document, child)
  ));
  return ofdXmlElement("ofd:OutlineElem", {
    Title: outline.title,
    Count: countOutlineChildren(outline),
    Expanded: outline.expanded
  }, children);
}

/**
 * Counts leaf nodes below one outline node.
 *
 * @param outline - Outline node.
 * @returns Leaf-node count.
 */
function countOutlineChildren(outline: OFDOutlineOptions): number {
  return (outline.children ?? []).reduce(
    (count, child) => count + ((child.children?.length ?? 0) === 0
      ? 1
      : countOutlineChildren(child)),
    0
  );
}


/**
 * Compiles document permissions.
 *
 * @param permissions - Permission policy.
 * @returns Permissions element.
 */
function compilePermissions(permissions: OFDPermissions): OFDXmlElement {
  const children: OFDXmlElement[] = [];
  appendBoolean(children, "ofd:Edit", permissions.edit);
  appendBoolean(children, "ofd:Annot", permissions.annotate);
  appendBoolean(children, "ofd:Export", permissions.export);
  appendBoolean(children, "ofd:Signature", permissions.signature);
  appendBoolean(children, "ofd:Watermark", permissions.watermark);
  appendBoolean(children, "ofd:PrintScreen", permissions.printScreen);
  if (permissions.print !== undefined || permissions.printCopies !== undefined) {
    children.push(ofdXmlElement("ofd:Print", {
      Printable: permissions.print,
      Copies: permissions.printCopies
    }));
  }
  return ofdXmlElement("ofd:Permissions", {}, children);
}

/**
 * Compiles viewer preferences.
 *
 * @param preferences - Viewer preferences.
 * @returns VPreferences element.
 */
function compileViewerPreferences(
  preferences: OFDViewerPreferences
): OFDXmlElement {
  const children: OFDXmlElement[] = [];
  appendText(children, "ofd:PageMode", preferences.pageMode);
  appendText(children, "ofd:PageLayout", preferences.pageLayout);
  appendText(children, "ofd:TabDisplay", preferences.tabDisplay);
  appendBoolean(children, "ofd:HideToolbar", preferences.hideToolbar);
  appendBoolean(children, "ofd:HideMenubar", preferences.hideMenubar);
  appendBoolean(children, "ofd:HideWindowUI", preferences.hideWindowUI);
  appendBoolean(children, "ofd:FitWindow", preferences.fitWindow);
  appendBoolean(children, "ofd:CenterWindow", preferences.centerWindow);
  if (preferences.zoomMode !== undefined) {
    appendText(children, "ofd:ZoomMode", preferences.zoomMode);
  } else if (preferences.zoomScale !== undefined) {
    children.push(ofdXmlElement(
      "ofd:Zoom",
      {},
      [formatOFDNumber(preferences.zoomScale)]
    ));
  }
  return ofdXmlElement("ofd:VPreferences", {}, children);
}

/**
 * Appends one optional text element.
 *
 * @param target - Mutable element sink.
 * @param name - Qualified element name.
 * @param value - Optional text.
 */
function appendText(
  target: OFDXmlElement[],
  name: string,
  value: string | undefined
): void {
  if (value !== undefined && value.length > 0) {
    target.push(ofdXmlElement(name, {}, [value]));
  }
}

/**
 * Appends one optional boolean element.
 *
 * @param target - Mutable element sink.
 * @param name - Qualified element name.
 * @param value - Optional boolean.
 */
function appendBoolean(
  target: OFDXmlElement[],
  name: string,
  value: boolean | undefined
): void {
  if (value !== undefined) {
    target.push(ofdXmlElement(name, {}, [String(value)]));
  }
}

/**
 * Resolves or derives a stable document identifier.
 *
 * @param document - Assigned document.
 * @returns Stable identifier.
 */
function resolveDocumentId(document: OFDAssignedDocument): string {
  const explicit = document.source.metadata.documentId?.trim();
  if (explicit) return explicit;
  const evidence = JSON.stringify({
    metadata: document.source.metadata,
    templates: document.templates.map((template) => ({
      width: template.source.options.width,
      height: template.source.options.height,
      objects: template.layers.map((layer) => collectGraphicIds(layer.objects))
    })),
    pages: document.pages.map((page) => ({
      width: page.source.options.width,
      height: page.source.options.height,
      templates: page.source.templates.map((template) => template.templateIdentity),
      objects: page.layers.map((layer) => collectGraphicIds(layer.objects))
    }))
  });
  return digestOFDText(evidence).slice(0, 32);
}

/**
 * Collects assigned graphic IDs from a layer or nested page-block sequence.
 *
 * @param children - Ordered assigned graphic or page-block children.
 * @returns Ordered recursive graphic identifier evidence.
 */
function collectGraphicIds(
  children: readonly OFDAssignedPageBlockChild[]
): readonly unknown[] {
  return children.map((child) => "children" in child
    ? collectGraphicIds(child.children)
    : child.id
  );
}
