import type { Component } from "vue";
import type { QuireKitFieldsetAppearance, QuireKitFieldsetOrientation } from "../../components/fieldset";
import type { QuireKitFormContext, QuireKitFormProps, QuireKitFormSlotProps, QuireKitFormValues } from "../form/types";
import type { QuireKitFormFieldProps, QuireKitFormFieldSlotProps } from "../form-field/types";

/** Trusted condition evaluated against the single form values authority. */
export type QuireKitSchemaCondition = boolean | ((values: QuireKitFormValues) => boolean);
/** Built-in standard control names; consumers can add explicit registry keys. */
export type QuireKitSchemaBuiltinControl = "input" | "textarea" | "number" | "select" | "checkbox" | "switch";

/** A registered field, with trusted presentation configuration. */
export interface QuireKitSchemaField extends Omit<QuireKitFormFieldProps, "disabled" | "readOnly"> {
  /** Stable render identity, defaulting to the field path. */
  readonly key?: string | undefined;
  /** Built-in or explicitly registered control. A named field slot overrides it. */
  readonly control: QuireKitSchemaBuiltinControl | (string & {});
  /** Extra control options; canonical model/state bindings take priority. */
  readonly props?: Readonly<Record<string, unknown>> | undefined;
  /** False unmounts the field while preserving its draft by default. */
  readonly visible?: QuireKitSchemaCondition | undefined;
  /** Skip field validation and editing, including inherited group disablement. */
  readonly disabled?: QuireKitSchemaCondition | undefined;
  /** Disallow editing while continuing validation. */
  readonly readOnly?: QuireKitSchemaCondition | undefined;
}

/** A semantic fieldset; it never creates a nested native form. */
export interface QuireKitSchemaGroup {
  /** Stable, sibling-unique identity independent of ordering. */
  readonly key: string;
  /** Accessible group name. */
  readonly legend: string;
  /** Hide the visible legend while preserving the group name. */
  readonly legendHidden?: boolean | undefined;
  /** Optional group-level guidance. */
  readonly description?: string | undefined;
  /** Reuse the existing plain/outline Fieldset appearance. */
  readonly appearance?: QuireKitFieldsetAppearance | undefined;
  /** Fieldset's responsive field arrangement. */
  readonly orientation?: QuireKitFieldsetOrientation | undefined;
  /** Ordered nested groups and fields. */
  readonly children: readonly QuireKitSchemaNode[];
  /** Hide/unmount the whole group, preserving field drafts. */
  readonly visible?: QuireKitSchemaCondition | undefined;
  /** Inherited field disablement and validation exclusion. */
  readonly disabled?: QuireKitSchemaCondition | undefined;
  /** Inherited editing restriction. */
  readonly readOnly?: QuireKitSchemaCondition | undefined;
}

/** The deliberately small field/group tree grammar. */
export type QuireKitSchemaNode = QuireKitSchemaField | QuireKitSchemaGroup;

/** Explicit custom component adapter; no component-path or expression evaluation. */
export interface QuireKitSchemaControl {
  /** Trusted Vue component implementing the accessible control contract. */
  readonly component: Component;
  /** Controlled model prop, default modelValue. */
  readonly modelProp?: string | undefined;
  /** Emitted update event, default update:modelValue. */
  readonly updateEvent?: string | undefined;
  /** Convert stored data to the component model; never modifies the draft. */
  readonly toControl?: ((value: unknown) => unknown) | undefined;
  /** Convert an emitted model into stored data. */
  readonly fromControl?: ((value: unknown) => unknown) | undefined;
}
/** Per-instance allowlist of component adapters. */
export type QuireKitSchemaRegistry = Readonly<Record<string, QuireKitSchemaControl>>;

/** Config-driven form inputs, sharing the handwritten form lifecycle. */
export interface QuireKitSchemaFormProps extends QuireKitFormProps {
  /** Trusted field/group tree with stable identities. */
  readonly fields: readonly QuireKitSchemaNode[];
  /** Per-instance component adapters, overriding built-ins with the same key. */
  readonly registry?: QuireKitSchemaRegistry | undefined;
}

/** Path-named slot context; QuireFormField still owns label and validation. */
export interface QuireKitSchemaFieldSlotProps extends QuireKitFormFieldSlotProps {
  /** The original field definition. */
  readonly field: QuireKitSchemaField;
  /** Existing form context for cross-field custom interactions. */
  readonly form: QuireKitFormContext;
}

/** Schema form slots: actions and errors share the native form boundary. */
export interface QuireKitSchemaFormSlots {
  /** Extra content rendered after generated fields. */
  readonly default?: ((form: QuireKitFormSlotProps) => unknown) | undefined;
  /** Explicit consumer-provided save/reset actions. */
  readonly actions?: ((form: QuireKitFormSlotProps) => unknown) | undefined;
  /** Optional replacement for request error feedback. */
  readonly error?: ((form: QuireKitFormSlotProps) => unknown) | undefined;
  /** Field overrides keyed by the exact registered path, including dots/brackets. */
  readonly [name: `field:${string}`]: ((field: QuireKitSchemaFieldSlotProps) => unknown) | undefined;
}
