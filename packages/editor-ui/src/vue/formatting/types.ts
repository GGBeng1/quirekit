import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
/** One font choice with an optional resource availability hint. */
export interface EditorUIFontOption {
 /** Stable identity. */ readonly value: string;
 /** Visible family name. */ readonly label: string;
 /** CSS preview family. */ readonly family?: string | undefined;
 /** Resource availability. */ readonly availabilityMessage?: string | undefined;
}
/** Presentation-only input shared by Classic and continuous-flow font fields. */
export interface EditorUIFontFieldProps {
 /** Public Toolbar control scope. */ readonly scope: QuireKitToolbarRendererScope;
 /** Family or point-size field. */ readonly kind: "family" | "size";
 /** Complete accessible field label. */ readonly label: string;
 /** Current option. */ readonly value: string | null;
 /** Empty or mixed-state label. */ readonly placeholder: string;
 /** Shared options. */ readonly options: readonly EditorUIFontOption[];
 /** Whether the resolved value is uniform, inherited or mixed. */ readonly formatState?: string | undefined;
 /** Async resource installation. */ readonly busy?: boolean | undefined;
 /** Product popup attributes. */ readonly contentProps?: Record<string, unknown> | undefined;
 /** Product control selector retained across extraction. */ readonly controlClass?: string | undefined;
 /** Product-specific empty resource message. */ readonly emptyLabel?: string | undefined;
 /** Allows numeric/custom family values when admitted by the command owner. */ readonly allowCustomValue?: boolean | undefined;
}
/** Shared split-color button inputs; document semantics stay in the caller. */
export interface EditorUIColorButtonProps {
 /** Public Toolbar scope. */ readonly scope: QuireKitToolbarRendererScope;
 /** Disclosure accessible label. */ readonly disclosureLabel: string;
 /** Current picker draft. */ readonly color: string;
 /** Direct color absent. */ readonly resetActive: boolean;
 /** Recently committed palette. */ readonly recentColors: readonly string[];
 /** Primitive palette/copy options shared by the feature. */ readonly pickerProps?: Record<string, unknown> | undefined;
 /** Brush toggle state. */ readonly actionState?: Record<string, unknown> | undefined;
}
