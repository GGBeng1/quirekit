/** Digest algorithms exposed to optional OFD security providers. */
export type OFDDigestAlgorithm = "SHA-256" | "SM3";

/** Signature algorithms exposed to optional OFD signing providers. */
export type OFDSignatureAlgorithm =
  | "RSA-PKCS1-v1_5-SHA256"
  | "ECDSA-SHA256"
  | "SM2-SM3";

/** Request passed to a caller-owned digest provider. */
export interface OFDDigestRequest {
  /** Digest algorithm selected by the signing or integrity profile. */
  readonly algorithm: OFDDigestAlgorithm;
  /** Complete bytes to digest. */
  readonly data: Uint8Array;
  /** Optional package path associated with the bytes. */
  readonly packagePath?: string;
}

/** Portable digest implementation supplied by an application. */
export interface OFDDigestProvider {
  /**
   * Digests one immutable byte sequence.
   *
   * @param request - Algorithm, bytes, and optional package evidence.
   * @returns Complete digest bytes.
   */
  digest(request: OFDDigestRequest): Promise<Uint8Array>;
}

/** Request passed to a caller-owned signature provider. */
export interface OFDSignatureRequest {
  /** Signature algorithm selected by the document profile. */
  readonly algorithm: OFDSignatureAlgorithm;
  /** Precomputed digest bytes to sign. */
  readonly digest: Uint8Array;
  /** Optional opaque key identifier understood only by the provider. */
  readonly keyId?: string;
  /** Optional signature-purpose label included in provider audit logs. */
  readonly purpose?: string;
}

/** Result returned by a caller-owned signature provider. */
export interface OFDSignatureResult {
  /** Complete signature value bytes. */
  readonly signature: Uint8Array;
  /** Optional DER certificate chain ordered leaf-first. */
  readonly certificateChain?: readonly Uint8Array[];
}

/** Portable signature implementation supplied by an application. */
export interface OFDSignatureProvider {
  /**
   * Signs one precomputed digest without exposing private key material.
   *
   * @param request - Algorithm, digest, and provider-owned key selection.
   * @returns Signature value and optional certificate chain.
   */
  sign(request: OFDSignatureRequest): Promise<OFDSignatureResult>;
}

/** Request passed to a caller-owned trusted timestamp provider. */
export interface OFDTimestampRequest {
  /** Digest algorithm used for the signature value. */
  readonly algorithm: OFDDigestAlgorithm;
  /** Digest of the signature value being timestamped. */
  readonly signatureDigest: Uint8Array;
}

/** Portable trusted timestamp implementation supplied by an application. */
export interface OFDTimestampProvider {
  /**
   * Obtains one timestamp token from an application-authorized authority.
   *
   * @param request - Signature digest evidence.
   * @returns Complete opaque timestamp token bytes.
   */
  timestamp(request: OFDTimestampRequest): Promise<Uint8Array>;
}

/** Request passed to an optional package encryption provider. */
export interface OFDEncryptionRequest {
  /** Profile-specific algorithm identifier owned by the provider integration. */
  readonly algorithm: string;
  /** Complete plaintext package-entry bytes. */
  readonly data: Uint8Array;
  /** Package path associated with the plaintext. */
  readonly packagePath: string;
  /** Optional opaque key identifier understood only by the provider. */
  readonly keyId?: string;
}

/** Result returned by an optional package encryption provider. */
export interface OFDEncryptionResult {
  /** Complete ciphertext bytes. */
  readonly ciphertext: Uint8Array;
  /** Provider-owned parameters required by the selected OFD profile. */
  readonly parameters: Readonly<Record<string, string>>;
}

/** Portable encryption implementation supplied by an application. */
export interface OFDEncryptionProvider {
  /**
   * Encrypts one package entry without exposing key material to the writer.
   *
   * @param request - Algorithm, plaintext, path, and provider key selection.
   * @returns Ciphertext and profile parameters.
   */
  encrypt(request: OFDEncryptionRequest): Promise<OFDEncryptionResult>;
}
