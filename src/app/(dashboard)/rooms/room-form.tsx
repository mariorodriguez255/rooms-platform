"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { FormError } from "@/components/forms/form-alert";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { ROOM_STATUSES } from "@/lib/rooms/board-state";
import { ROOM_FEATURES } from "@/lib/rooms/features";
import { initialFormState, type FormState } from "@/lib/validation/form";

import type { RoomField } from "./actions";

type RoomFormProps = {
  // createRoom bound to the property id, or updateRoom bound to the room id.
  action: (
    previous: FormState<RoomField>,
    formData: FormData,
  ) => Promise<FormState<RoomField>>;
  // Same shape as the form values; features as a comma-separated list.
  defaults?: Partial<Record<RoomField, string>>;
  submitLabel: string;
  cancelHref: string;
};

export function RoomForm({
  action,
  defaults = {},
  submitLabel,
  cancelHref,
}: RoomFormProps) {
  const t = useTranslations();
  const tValidation = useTranslations("validation");
  const [state, formAction] = useActionState(
    action,
    initialFormState as FormState<RoomField>,
  );
  const value = (field: RoomField) =>
    state.values?.[field] ?? defaults[field] ?? "";
  const checked = new Set(value("features").split(","));
  const featuresError = state.fieldErrors?.features;

  return (
    <form action={formAction} noValidate className="max-w-xl">
      <FieldGroup>
        <FormError error={state.error} />
        <TextField
          name="name"
          label={t("rooms.name")}
          description={t("rooms.nameHelp")}
          required
          maxLength={100}
          defaultValue={value("name")}
          error={state.fieldErrors?.name}
        />
        <div className="grid gap-7 sm:grid-cols-3">
          <TextField
            name="price"
            label={t("rooms.price")}
            required
            inputMode="decimal"
            defaultValue={value("price")}
            error={state.fieldErrors?.price}
          />
          <TextField
            name="deposit"
            label={t("rooms.deposit")}
            inputMode="decimal"
            defaultValue={value("deposit")}
            error={state.fieldErrors?.deposit}
          />
          <TextField
            name="size"
            label={t("rooms.size")}
            inputMode="decimal"
            defaultValue={value("size")}
            error={state.fieldErrors?.size}
          />
        </div>
        <SelectField
          // key: a native select only reads defaultValue when it mounts.
          key={`status-${value("status")}`}
          name="status"
          label={t("rooms.status")}
          options={ROOM_STATUSES.map((status) => ({
            value: status,
            label: t(`roomStatus.${status}`),
          }))}
          required
          defaultValue={value("status") || "vacant"}
          error={state.fieldErrors?.status}
        />
        <TextField
          name="availableFrom"
          type="date"
          label={t("rooms.availableFrom")}
          description={t("rooms.availableFromHelp")}
          defaultValue={value("availableFrom")}
          error={state.fieldErrors?.availableFrom}
          className="w-fit"
        />
        <FieldSet key={`features-${value("features")}`}>
          <FieldLegend variant="label">{t("rooms.features")}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROOM_FEATURES.map((feature) => (
              <Field key={feature} orientation="horizontal">
                <input
                  id={`feature-${feature}`}
                  type="checkbox"
                  name="features"
                  value={feature}
                  defaultChecked={checked.has(feature)}
                  className="size-4 accent-primary"
                />
                <FieldLabel
                  htmlFor={`feature-${feature}`}
                  className="font-normal"
                >
                  {t(`roomFeatures.${feature}`)}
                </FieldLabel>
              </Field>
            ))}
          </div>
          {featuresError ? (
            <FieldError>{tValidation(featuresError)}</FieldError>
          ) : null}
        </FieldSet>
        <div className="flex flex-wrap gap-3">
          <SubmitButton>{submitLabel}</SubmitButton>
          <Button variant="outline" asChild>
            <Link href={cancelHref}>{t("common.cancel")}</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
