import { ofdXmlElement, type OFDXmlElement } from "../xml";
import type { OFDDestination } from "../document/types";
import type { OFDAction } from "../action";
import type { OFDAssignedDocument } from "./types";
import { formatOFDNumber } from "./format";

/** Standard action event selected by the owning OFD structure. */
export type OFDActionEvent = "DO" | "PO" | "CLICK";

/**
 * Compiles an ordered action sequence for one standard event context.
 *
 * @param document - Assigned document used to resolve IDs.
 * @param actions - Typed action targets in execution order.
 * @param event - Standard trigger event required by the owning structure.
 * @returns Actions XML element, or undefined when no actions exist.
 */
export function compileOFDActions(
  document: OFDAssignedDocument,
  actions: readonly OFDAction[],
  event: OFDActionEvent
): OFDXmlElement | undefined {
  if (actions.length === 0) return undefined;
  return ofdXmlElement("ofd:Actions", {}, actions.map((action) =>
    ofdXmlElement("ofd:Action", { Event: event }, [
      compileOFDAction(document, action)
    ])
  ));
}

/**
 * Compiles a typed action target and resolves every document-local reference.
 *
 * @param document - Assigned document used to resolve IDs.
 * @param action - Typed action target.
 * @returns Typed standard action XML element.
 */
function compileOFDAction(
  document: OFDAssignedDocument,
  action: OFDAction
): OFDXmlElement {
  if (action.type === "goto") {
    return ofdXmlElement("ofd:Goto", {}, [
      compileOFDActionDestination(document, action.destination)
    ]);
  }
  if (action.type === "goto-bookmark") {
    return ofdXmlElement("ofd:Goto", {}, [
      ofdXmlElement("ofd:Bookmark", { Name: action.bookmark })
    ]);
  }
  if (action.type === "uri") {
    return ofdXmlElement("ofd:URI", {
      URI: action.uri,
      Base: action.base
    });
  }
  const attachment = document.attachments.find((candidate) =>
    candidate.source === action.attachment
  );
  if (!attachment) throw new TypeError("Action references an unknown OFD attachment.");
  return ofdXmlElement("ofd:GotoA", {
    AttachID: attachment.id,
    NewWindow: action.newWindow
  });
}

/**
 * Compiles a page-coordinate destination while resolving its page ID.
 *
 * @param document - Assigned document used to resolve page IDs.
 * @param destination - Typed target page and optional view coordinates.
 * @returns Standard `Dest` XML element.
 */
export function compileOFDActionDestination(
  document: OFDAssignedDocument,
  destination: OFDDestination
): OFDXmlElement {
  const page = document.pages.find((candidate) =>
    candidate.source.pageIdentity === destination.page.pageIdentity
  );
  if (!page) throw new TypeError("Destination page is not owned by the document.");
  return ofdXmlElement("ofd:Dest", {
    Type: destination.type ?? "XYZ",
    PageID: page.id
  }, [
    ...optionalValue("ofd:Left", destination.left),
    ...optionalValue("ofd:Right", destination.right),
    ...optionalValue("ofd:Top", destination.top),
    ...optionalValue("ofd:Bottom", destination.bottom),
    ...optionalValue("ofd:Zoom", destination.zoom)
  ]);
}

/**
 * Produces an optional single-text destination coordinate element.
 *
 * @param name - Qualified element name.
 * @param value - Optional numeric value.
 * @returns Empty or singleton destination coordinate collection.
 */
function optionalValue(name: string, value: number | undefined): OFDXmlElement[] {
  return value === undefined
    ? []
    : [ofdXmlElement(name, {}, [formatOFDNumber(value)])];
}
