import type { QuireHTMLDocumentProvider } from "./types";

/**
 * Returns the current browser document.
 *
 * @returns DOM document provider for browser helpers.
 */
export function getBrowserDocumentProvider(): QuireHTMLDocumentProvider {
  const document = globalThis.document;

  if (!document) {
    throw new Error(
      "[quirekit error]: @quirekit/html browser helpers require a DOM document. Use @quirekit/html/server in Node."
    );
  }

  return { document };
}
