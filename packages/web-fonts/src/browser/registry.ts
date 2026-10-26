import type {
  QuireInstalledWebFontAsset,
  QuireRegisteredWebFontFamily,
  QuireWebFontFamilyManifest,
  QuireWebFontRegistry
} from "../types";
import { QuireWebFontError } from "../types";
import { normalizeQuireWebFontFamily } from "../resource/identity";

/** Browser primitives used to construct a font registry. */
export interface QuireBrowserFontRegistryOptions {
  /** Font set owned by the target document. */
  readonly fontSet: FontFaceSet;
  /** FontFace constructor from the same browser realm. */
  readonly FontFace: typeof FontFace;
}

interface OwnedFontFamily {
  /** Registered provider result. */
  readonly registered: QuireRegisteredWebFontFamily;
  /** FontFace objects currently owned by the target set. */
  readonly faces: readonly FontFace[];
}

type LoadedFontFaceCandidate =
  | {
      /** Browser parsing succeeded. */
      readonly ok: true;
      /** Installed asset represented by this browser face. */
      readonly installed: QuireInstalledWebFontAsset;
      /** Loaded browser face. */
      readonly face: FontFace;
    }
  | {
      /** Browser parsing failed. */
      readonly ok: false;
      /** Installed asset represented by this browser face. */
      readonly installed: QuireInstalledWebFontAsset;
      /** Rejected browser face. */
      readonly face: FontFace;
      /** Browser parse failure. */
      readonly cause: unknown;
    };

/**
 * Creates an atomic browser FontFace registry for every usable family face.
 *
 * @param options - Target font set and constructor.
 * @returns Replaceable registry used by the loader.
 */
export function createQuireBrowserFontRegistry(
  options: QuireBrowserFontRegistryOptions
): QuireWebFontRegistry {
  const owned = new Map<string, OwnedFontFamily>();
  // Added faces are owned before readiness settles so teardown can release them immediately.
  const pendingFaces = new Set<FontFace>();
  let destroyed = false;

  return {
    /** @inheritdoc */
    hasFamily(family: string): boolean {
      return owned.has(normalizeQuireWebFontFamily(family));
    },
    /** @inheritdoc */
    async register(
      manifest: QuireWebFontFamilyManifest,
      assets: readonly QuireInstalledWebFontAsset[]
    ): Promise<QuireRegisteredWebFontFamily> {
      if (destroyed) throw new QuireWebFontError("destroyed", "Web font registry is destroyed");
      validateAssets(manifest, assets);

      // Parse every binary before mutating the shared document font set. Independently
      // ranged CSS shards follow browser stylesheet behavior: a rejected optional shard
      // is discarded only when the same descriptor face retains usable coverage.
      const candidates = await Promise.all(assets.map(async (installed) => (
        loadFontFaceCandidate(options.FontFace, manifest, installed)
      )));
      const loaded = candidates.filter((candidate) => candidate.ok);
      const rejected = candidates.filter((candidate) => !candidate.ok);
      const loadedFaceIds = new Set(loaded.map(({ installed }) => installed.face.id));
      const fatalRejection = rejected.find(({ installed }) => (
        installed.asset.unicodeRange === undefined
        || !loadedFaceIds.has(installed.face.id)
      ));
      if (fatalRejection !== undefined || loaded.length === 0) {
        throw new QuireWebFontError("font-parse", `Browser rejected font bytes for "${manifest.family}"`, {
          providerId: manifest.providerId,
          cause: fatalRejection?.cause ?? rejected[0]?.cause
        });
      }
      if (destroyed) throw new QuireWebFontError("destroyed", "Web font registry is destroyed");

      const faces = loaded.map(({ face }) => face);
      const registeredAssets = loaded.map(({ installed }) => installed);
      const registeredManifest = createRegisteredManifest(manifest, registeredAssets);
      const key = normalizeQuireWebFontFamily(manifest.family);
      const previous = owned.get(key);
      previous?.faces.forEach((face) => options.fontSet.delete(face));
      const added: FontFace[] = [];
      try {
        for (const face of faces) {
          options.fontSet.add(face);
          added.push(face);
          pendingFaces.add(face);
        }
        await options.fontSet.ready;
        if (destroyed) throw new QuireWebFontError("destroyed", "Web font registry is destroyed");
      } catch (cause) {
        added.forEach((face) => options.fontSet.delete(face));
        // A failed late completion must not resurrect a previously released family.
        if (destroyed) throw new QuireWebFontError("destroyed", "Web font registry is destroyed", { cause });
        previous?.faces.forEach((face) => options.fontSet.add(face));
        throw new QuireWebFontError("registration", `Failed to register "${manifest.family}"`, {
          providerId: manifest.providerId,
          cause
        });
      } finally {
        added.forEach((face) => pendingFaces.delete(face));
      }
      const registered = { manifest: registeredManifest, assets: registeredAssets };
      owned.set(key, { registered, faces });
      return registered;
    },
    /** @inheritdoc */
    unregister(family: string): void {
      const key = normalizeQuireWebFontFamily(family);
      const current = owned.get(key);
      current?.faces.forEach((face) => options.fontSet.delete(face));
      owned.delete(key);
    },
    /** @inheritdoc */
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      pendingFaces.forEach((face) => options.fontSet.delete(face));
      pendingFaces.clear();
      for (const current of owned.values()) {
        current.faces.forEach((face) => options.fontSet.delete(face));
      }
      owned.clear();
    }
  };
}

/**
 * Constructs and parses one browser face without mutating the document font set.
 *
 * @param Constructor - FontFace constructor from the owner realm.
 * @param manifest - Owning family manifest.
 * @param installed - Verified asset bytes and descriptors.
 * @returns Loaded or rejected candidate with its owning asset retained.
 */
async function loadFontFaceCandidate(
  Constructor: typeof FontFace,
  manifest: QuireWebFontFamilyManifest,
  installed: QuireInstalledWebFontAsset
): Promise<LoadedFontFaceCandidate> {
  const face = createFontFace(Constructor, manifest, installed);
  try {
    await face.load();
    return { ok: true, installed, face };
  } catch (cause) {
    return { ok: false, installed, face, cause };
  }
}

/**
 * Removes rejected optional shards from the manifest persisted for later restoration.
 *
 * @param manifest - Complete provider manifest.
 * @param assets - Assets accepted by the browser.
 * @returns Original manifest or a descriptor-preserving usable subset.
 */
function createRegisteredManifest(
  manifest: QuireWebFontFamilyManifest,
  assets: readonly QuireInstalledWebFontAsset[]
): QuireWebFontFamilyManifest {
  if (assets.length === manifest.faces.reduce((count, face) => count + face.assets.length, 0)) {
    return manifest;
  }
  const accepted = new Set(assets.map(({ asset }) => asset));
  return {
    ...manifest,
    faces: manifest.faces.map((face) => ({
      ...face,
      assets: face.assets.filter((asset) => accepted.has(asset))
    })).filter((face) => face.assets.length > 0)
  };
}

/**
 * Creates one FontFace for one face asset or Unicode shard.
 *
 * @param Constructor - FontFace constructor from the owner realm.
 * @param manifest - Owning family manifest.
 * @param installed - Verified bytes and CSS descriptors.
 * @returns Unloaded browser FontFace.
 */
function createFontFace(
  Constructor: typeof FontFace,
  manifest: QuireWebFontFamilyManifest,
  installed: QuireInstalledWebFontAsset
): FontFace {
  const descriptors: FontFaceDescriptors = {
    style: installed.face.style ?? "normal",
    weight: installed.face.weight ?? "normal",
    stretch: installed.face.stretch ?? "normal",
    ...(installed.asset.unicodeRange === undefined
      ? {}
      : { unicodeRange: installed.asset.unicodeRange })
  };
  return new Constructor(manifest.family, installed.data, descriptors);
}

/**
 * Ensures registration receives exactly one binary for every manifest asset.
 *
 * @param manifest - Complete provider candidate.
 * @param assets - Installed binaries.
 */
function validateAssets(
  manifest: QuireWebFontFamilyManifest,
  assets: readonly QuireInstalledWebFontAsset[]
): void {
  const expected = manifest.faces.reduce((count, face) => count + face.assets.length, 0);
  if (assets.length !== expected) {
    throw new QuireWebFontError(
      "registration",
      `Registration for "${manifest.family}" received ${assets.length} of ${expected} assets`,
      { providerId: manifest.providerId }
    );
  }
}
