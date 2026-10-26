/** Supported question input shapes; validation and submission authority remain with the host. */
export type QuireKitChatQuestionKind = 'single' | 'multiple' | 'text';

/** One stable option within a selection question. */
export interface QuireKitChatQuestionOption {
  /** Stable option value. */
  readonly value: string;
  /** Visible option text. */
  readonly label: string;
  /** Optional detail below the label. */
  readonly description?: string;
  /** Whether this option cannot be selected. */
  readonly disabled?: boolean;
}

/** One selectable free-text choice alongside a question's predefined options. */
export interface QuireKitChatQuestionCustomOption {
  /** Stable value distinct from every predefined option value in this question. */
  readonly value: string;
  /** Visible choice label, such as “其他”. */
  readonly label: string;
  /** Prompt shown only while this choice is selected; the language pack supplies the default. */
  readonly placeholder?: string;
}

/** One prompt in a question request. */
export interface QuireKitChatQuestionItem {
  /** Stable identity within the request. */
  readonly id: string;
  /** Visible and accessible prompt. */
  readonly title: string;
  /** Supporting explanation. */
  readonly description?: string;
  /** Input type. */
  readonly kind: QuireKitChatQuestionKind;
  /** Predefined choices for single/multiple questions; unused for text. */
  readonly options?: readonly QuireKitChatQuestionOption[];
  /** Optional free-text choice for single/multiple questions; its value must not occur in options. */
  readonly customOption?: QuireKitChatQuestionCustomOption;
  /** Whether a response is required; defaults to true. */
  readonly required?: boolean;
  /** Text input placeholder. */
  readonly placeholder?: string;
}

/** Draft or submitted answer to one stable question. */
export interface QuireKitChatQuestionAnswer {
  /** Question identity. */
  readonly questionId: string;
  /** Single/text answers use a string, multiple answers use an ordered array. */
  readonly value: string | readonly string[];
  /** Text belonging to the selected custom option; omitted from a submitted answer when not selected. */
  readonly custom?: string;
}

/** Explicit submit intent, without network or authorization behavior. */
export interface QuireKitChatQuestionSubmitDetails {
  /** Stable host request identity. */
  readonly requestId: string;
  /** One answer per visible question, including optional empty answers. */
  readonly answers: readonly QuireKitChatQuestionAnswer[];
}

/** Host-owned answer lifecycle. */
export type QuireKitChatQuestionState = 'pending' | 'submitting' | 'answered' | 'expired' | 'failed';

/** Form renders answer controls; prompt leaves the answer surface to the host. */
export type QuireKitChatQuestionPresentation = 'form' | 'prompt';

/** Intent to open the answer surface for one stable request. */
export interface QuireKitChatQuestionOpenDetails {
  /** Stable host request identity. */
  readonly requestId: string;
}

/** Public multi-question presentation contract. */
export interface QuireKitChatQuestionProps {
  /** Stable request identity; a change resets only the component's uncontrolled draft. */
  readonly requestId: string;
  /** Request title. */
  readonly title: string;
  /** Optional introductory text. */
  readonly description?: string;
  /** Ordered, stable questions. */
  readonly questions: readonly QuireKitChatQuestionItem[];
  /** Host-owned lifecycle. */
  readonly state: QuireKitChatQuestionState;
  /** Render answer controls or a compact transcript prompt; defaults to form. */
  readonly presentation?: QuireKitChatQuestionPresentation;
  /** Controlled answer draft, independent of the ordinary Composer draft. */
  readonly draft?: readonly QuireKitChatQuestionAnswer[];
  /** Initial uncontrolled answer draft. */
  readonly defaultDraft?: readonly QuireKitChatQuestionAnswer[];
  /** Confirmed answers shown in the answered state. */
  readonly answers?: readonly QuireKitChatQuestionAnswer[];
  /** Submission error, shown without clearing the draft. */
  readonly error?: string;
}
