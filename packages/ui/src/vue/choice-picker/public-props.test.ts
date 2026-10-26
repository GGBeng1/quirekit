import { expectTypeOf, it } from "vitest";
import type { QuireKitChoicePickerProps } from "../../components/choice-picker";
import type { QuireChoicePicker } from "./index";

type ComponentProps = InstanceType<typeof QuireChoicePicker>["$props"];
type RequiredProps = { title: string; items: [] };
type SingleImmediate = RequiredProps & { selectionMode: "single"; commitMode: "immediate" };
type SingleExplicit = RequiredProps & { selectionMode: "single"; commitMode: "explicit" };
type DefaultSingleImmediate = RequiredProps & { commitMode: "immediate" };
type MultipleExplicit = RequiredProps & { selectionMode: "multiple"; commitMode: "explicit" };
type MultipleDefault = RequiredProps & { selectionMode: "multiple" };
type MultipleImmediate = RequiredProps & { selectionMode: "multiple"; commitMode: "immediate" };

it("preserves the selection and commit mode union in the public Props contract", () => {
  expectTypeOf<SingleImmediate>().toExtend<QuireKitChoicePickerProps>();
  expectTypeOf<SingleExplicit>().toExtend<QuireKitChoicePickerProps>();
  expectTypeOf<DefaultSingleImmediate>().toExtend<QuireKitChoicePickerProps>();
  expectTypeOf<MultipleExplicit>().toExtend<QuireKitChoicePickerProps>();
  expectTypeOf<MultipleDefault>().toExtend<QuireKitChoicePickerProps>();
  expectTypeOf<MultipleImmediate>().not.toExtend<QuireKitChoicePickerProps>();
});

it("preserves the same union on the actual exported Vue component", () => {
  expectTypeOf<SingleImmediate>().toExtend<ComponentProps>();
  expectTypeOf<SingleExplicit>().toExtend<ComponentProps>();
  expectTypeOf<DefaultSingleImmediate>().toExtend<ComponentProps>();
  expectTypeOf<MultipleExplicit>().toExtend<ComponentProps>();
  expectTypeOf<MultipleDefault>().toExtend<ComponentProps>();
  expectTypeOf<MultipleImmediate>().not.toExtend<ComponentProps>();
});
