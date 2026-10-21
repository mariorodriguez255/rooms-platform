import { z } from "zod";

import { isIsoDate } from "@/lib/dates";
import { parseEuros } from "@/lib/money";
import { parseDecimal } from "@/lib/numbers";
import { SPANISH_REGIONS } from "@/lib/regions";
import { ROOM_STATUSES } from "@/lib/rooms/board-state";
import { ROOM_FEATURES } from "@/lib/rooms/features";

// Schemas of the property and room forms. Error messages are keys of the
// "validation" messages (see form.ts). Limits mirror the check constraints
// of supabase/migrations/…_properties_rooms_photos.sql.

const nameSchema = z.string().trim().min(1, "required").max(100, "tooLong");

// Optional amount in euros as typed ("450,50") → cents, or null if empty.
const optionalAmountSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const cents = parseEuros(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "amountInvalid" });
      return z.NEVER;
    }
    return cents;
  });

const priceSchema = z
  .string()
  .trim()
  .min(1, "required")
  .transform((value, ctx) => {
    const cents = parseEuros(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "amountInvalid" });
      return z.NEVER;
    }
    if (cents === 0) {
      ctx.addIssue({ code: "custom", message: "priceZero" });
      return z.NEVER;
    }
    return cents;
  });

// Square metres with one decimal at most, more than 0 and less than 1000.
const optionalSizeSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const tenths = parseDecimal(value, 1);
    if (tenths === null || tenths === 0 || tenths >= 10_000) {
      ctx.addIssue({ code: "custom", message: "sizeInvalid" });
      return z.NEVER;
    }
    return tenths / 10;
  });

const optionalDateSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isIsoDate(value), "dateInvalid")
  .transform((value) => (value === "" ? null : value));

export const propertySchema = z.object({
  name: nameSchema,
  address: z.string().trim().min(1, "required").max(200, "addressTooLong"),
  city: nameSchema,
  region: z.enum(SPANISH_REGIONS, "regionInvalid"),
  totalRentReference: optionalAmountSchema,
});

export const roomSchema = z.object({
  name: nameSchema,
  price: priceSchema,
  deposit: optionalAmountSchema,
  size: optionalSizeSchema,
  status: z.enum(ROOM_STATUSES, "statusInvalid"),
  availableFrom: optionalDateSchema,
  features: z.array(z.enum(ROOM_FEATURES, "featureInvalid")),
});

export const propertyIdSchema = z.uuid();
export const roomIdSchema = z.uuid();
