import type { QuireEditorInputBindingOptions } from "../types";
/** Owner record stored for one document-level mounted input focus claim. */
interface QuireMountedInputFocusOwner {
  /** Stable identity token for the mounted input binding. */
  readonly token: object;
  /** Releases transient state for the previous owner. */
  readonly release: () => void;
}

const activeInputOwnersByDocument = new WeakMap<Document, QuireMountedInputFocusOwner>();

/** Options used to claim mounted input focus ownership. */
export interface ClaimCanvasMountedInputFocusOptions {
  /** Textarea input proxy that belongs to the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Stable identity token for the owner. */
  readonly token: object;
  /** Releases transient state for this owner when another owner claims focus. */
  readonly release: () => void;
}

/**
 * Claims document-level input ownership and releases the previous mounted owner.
 *
 * @param options - Input proxy, owner token, and release callback.
 */
export function claimQuireMountedInputFocusOwnership(
  options: ClaimCanvasMountedInputFocusOptions
): void {
  const ownerDocument = options.inputProxy.ownerDocument;
  const previousOwner = activeInputOwnersByDocument.get(ownerDocument);

  if (previousOwner && previousOwner.token !== options.token) {
    previousOwner.release();
  }

  activeInputOwnersByDocument.set(ownerDocument, {
    token: options.token,
    release: options.release
  });
}

/**
 * Releases document-level input ownership when the provided token still owns it.
 *
 * @param inputProxy - Textarea input proxy whose document stores ownership.
 * @param token - Stable owner token to release.
 */
export function releaseQuireMountedInputFocusOwnership(
  inputProxy: HTMLTextAreaElement,
  token: object
): void {
  const ownerDocument = inputProxy.ownerDocument;

  if (activeInputOwnersByDocument.get(ownerDocument)?.token === token) {
    activeInputOwnersByDocument.delete(ownerDocument);
  }
}

/** Binding facts and router callbacks one mounted input focus lifecycle needs. */
export interface QuireMountedInputFocusOptions {
  /** Editor, input proxy, and focus observers of the binding. */
  readonly binding: QuireEditorInputBindingOptions;
  /** Stable identity token for document-level ownership. */
  readonly token: object;
  /** Clears IME/controller/input-proxy state without committing preedit text. */
  readonly cancelTransientInputState: () => void;
  /** @returns Whether a blur belongs to a deliberate native input session restart. */
  readonly isRestartingNativeSession: () => boolean;
}

/** Focus lifecycle of one mounted input binding. */
export interface QuireMountedInputFocus {
  /** Claims document-level input ownership and cancels any previous mounted input. */
  claim(): void;
  /** Releases document-level input ownership and clears transient IME residue. */
  release(): void;
  /** @param event - Browser focus event marking this view focused. */
  handleFocus(event: FocusEvent): void;
  /** @param event - Browser blur event that ends this view's input ownership. */
  handleBlur(event: FocusEvent): void;
}

/**
 * Creates the focus lifecycle of one mounted input binding.
 *
 * Focus and blur are recorded as PM meta transactions without an undo step.
 *
 * @param options - Binding facts and router callbacks.
 * @returns Focus lifecycle.
 */
export function createQuireMountedInputFocus(options: QuireMountedInputFocusOptions): QuireMountedInputFocus {
  const { binding, token } = options;
  const record = (kind: "focus" | "blur", event: FocusEvent): void => {
    binding.editor.dispatchTransaction(binding.editor.state.pm.tr.setMeta(kind, { event }).setMeta("addToHistory", false));
  };
  const focus: QuireMountedInputFocus = {
    claim() {
      claimQuireMountedInputFocusOwnership({
        inputProxy: binding.inputProxy,
        token,
        release: () => {
          focus.release();
          binding.onInputOwnershipLost?.();
        }
      });
    },
    release() {
      releaseQuireMountedInputFocusOwnership(binding.inputProxy, token);
      options.cancelTransientInputState();
      binding.onFocusChange?.(false);
    },
    handleFocus(event) {
      focus.claim();
      record("focus", event);
      binding.onFocusChange?.(true);
    },
    handleBlur(event) {
      record("blur", event);
      focus.release();
      if (!options.isRestartingNativeSession()) binding.onInputOwnershipLost?.(event);
    }
  };
  return focus;
}
