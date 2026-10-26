import type {
  QuireMediaIntrinsicSize,
  QuireResolvedMediaAsset
} from "@quirekit/media";
import { resolveQuireImageDecodeSize } from "./decode-size";
import type {
  QuireImageDecodeRequest,
  QuireImageResourceDecoder
} from "./types";

/**
 * Creates the default browser image decoder for one mounted document.
 *
 * With a raster demand, raster formats decode into an `ImageBitmap` at the
 * covering power-of-two level and are closed on release; the `<img>` only reads
 * the intrinsic size, which does not decode pixels. SVG, browsers without
 * `createImageBitmap`, and demand-free calls keep the `<img>` as the source.
 *
 * @param ownerDocument - Document used to create the decoded image element.
 * @returns Decoder that owns and revokes object URLs.
 */
export function createQuireBrowserImageResourceDecoder(
  ownerDocument: Document
): QuireImageResourceDecoder {
  return {
    async decode(asset, request) {
      const urlApi = ownerDocument.defaultView?.URL ?? globalThis.URL;
      const bytes = new Uint8Array(asset.bytes);
      const href = urlApi.createObjectURL(new Blob([bytes.buffer], {
        type: asset.mimeType
      }));
      const image = ownerDocument.createElement("img");

      try {
        await loadImageElement(image, href);
        const intrinsicSize = resolveIntrinsicSize(asset, image);
        const bitmap = await createScaledBitmap(ownerDocument, image, asset, intrinsicSize, request);
        if (bitmap !== undefined) image.removeAttribute("src");
        let released = false;
        return {
          source: bitmap ?? image,
          href,
          intrinsicSize,
          ...(bitmap === undefined ? {} : { pixelSize: { width: bitmap.width, height: bitmap.height } }),
          release(): void {
            if (released) return;
            released = true;
            bitmap?.close();
            image.removeAttribute("src");
            urlApi.revokeObjectURL(href);
          }
        };
      } catch (error) {
        image.removeAttribute("src");
        urlApi.revokeObjectURL(href);
        throw error;
      }
    }
  };
}

/**
 * Decodes a loaded raster image at the level covering a raster demand.
 *
 * @param ownerDocument - Document whose window provides `createImageBitmap`.
 * @param image - Loaded image element; drawing from it keeps its orientation.
 * @param asset - Resolved asset, used to keep SVG on the element path.
 * @param intrinsicSize - Positive intrinsic size.
 * @param request - Optional raster demand.
 * @returns Scaled bitmap, or undefined when the element must stay the source.
 */
async function createScaledBitmap(
  ownerDocument: Document,
  image: HTMLImageElement,
  asset: QuireResolvedMediaAsset,
  intrinsicSize: QuireMediaIntrinsicSize,
  request: QuireImageDecodeRequest | undefined
): Promise<ImageBitmap | undefined> {
  const view = ownerDocument.defaultView;
  if (request === undefined || asset.mimeType === "image/svg+xml" || typeof view?.createImageBitmap !== "function") {
    return undefined;
  }
  const size = resolveQuireImageDecodeSize(intrinsicSize, request.pixelSize);
  try {
    return await view.createImageBitmap(image, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: "high"
    });
  } catch {
    return undefined;
  }
}

/**
 * Waits for one image element to load an owned object URL.
 *
 * @param image - Image element to initialize.
 * @param href - Owned object URL.
 * @returns Promise settled by the browser load result.
 */
function loadImageElement(
  image: HTMLImageElement,
  href: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("Mounted image decoding failed.")),
      { once: true }
    );
    image.src = href;
  });
}

/**
 * Resolves positive source dimensions from repository metadata or decoding.
 *
 * @param asset - Resolved portable asset.
 * @param image - Loaded browser image.
 * @returns Positive intrinsic dimensions.
 */
function resolveIntrinsicSize(
  asset: QuireResolvedMediaAsset,
  image: HTMLImageElement
): QuireMediaIntrinsicSize {
  const size = asset.intrinsicSize ?? {
    width: image.naturalWidth,
    height: image.naturalHeight
  };
  if (
    !Number.isFinite(size.width)
    || size.width <= 0
    || !Number.isFinite(size.height)
    || size.height <= 0
  ) {
    throw new RangeError("Decoded image has no positive intrinsic size.");
  }
  return size;
}
