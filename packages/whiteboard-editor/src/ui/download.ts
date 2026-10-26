/** @param owner - Active window. @param blob - Prepared file. @param name - User-visible filename. */
export function downloadWhiteboardFile(owner: Document, blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob), link = owner.createElement("a");
  link.href = url; link.download = name; link.click();
  // A delayed release allows the browser to accept the download before revocation.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
