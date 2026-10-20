import type { Messages } from "next-intl";
import { z } from "zod";

import type { ErrorKey } from "@/lib/errors";

// Schemas use keys of the "validation" messages as error messages, so the
// UI can translate them. Shared result shape of every form Server Action.

export type ValidationKey = keyof Messages["validation"];

export type FormState<Field extends string = string> = {
  status: "idle" | "error" | "success";
  error?: ErrorKey;
  fieldErrors?: Partial<Record<Field, ValidationKey>>;
  // Submitted values to refill the form after an error (never passwords).
  values?: Partial<Record<Field, string>>;
};

export const initialFormState: FormState = { status: "idle" };

export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError,
): Partial<Record<Field, ValidationKey>> {
  const result: Partial<Record<Field, ValidationKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in result)) {
      result[field as Field] = issue.message as ValidationKey;
    }
  }
  return result;
}

// Reads text fields from FormData. Files and missing fields become "".
export function formValues<Field extends string>(
  formData: FormData,
  fields: readonly Field[],
): Record<Field, string> {
  const values = {} as Record<Field, string>;
  for (const field of fields) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}
