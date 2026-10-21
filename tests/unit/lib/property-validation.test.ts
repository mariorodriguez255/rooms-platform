import { describe, expect, it } from "vitest";

import { fieldErrorsFrom } from "@/lib/validation/form";
import { propertySchema, roomSchema } from "@/lib/validation/property";
import messages from "@/messages/es.json";

const validProperty = {
  name: " Piso Malasaña ",
  address: "Calle Ficticia 12, 3.º B",
  city: "Madrid",
  region: "ES-MD",
  totalRentReference: "",
};

const validRoom = {
  name: "Habitación 1",
  price: "450,50",
  deposit: "",
  size: "12,5",
  status: "occupied",
  availableFrom: "2026-12-01",
  features: ["balcony", "desk"],
};

describe("propertySchema", () => {
  it("trims text and turns amounts into cents", () => {
    expect(
      propertySchema.parse({ ...validProperty, totalRentReference: "1.800" }),
    ).toEqual({
      name: "Piso Malasaña",
      address: "Calle Ficticia 12, 3.º B",
      city: "Madrid",
      region: "ES-MD",
      totalRentReference: 180000,
    });
    expect(propertySchema.parse(validProperty).totalRentReference).toBeNull();
  });

  it("reports each field with a translatable key", () => {
    const result = propertySchema.safeParse({
      name: " ",
      address: "x".repeat(201),
      city: "",
      region: "ES-XX",
      totalRentReference: "mucho",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      name: "required",
      address: "addressTooLong",
      city: "required",
      region: "regionInvalid",
      totalRentReference: "amountInvalid",
    });
  });
});

describe("roomSchema", () => {
  it("parses the room form", () => {
    expect(roomSchema.parse(validRoom)).toEqual({
      name: "Habitación 1",
      price: 45050,
      deposit: null,
      size: 12.5,
      status: "occupied",
      availableFrom: "2026-12-01",
      features: ["balcony", "desk"],
    });
  });

  it("treats empty optional fields as null", () => {
    const parsed = roomSchema.parse({
      ...validRoom,
      size: "",
      availableFrom: "",
      features: [],
    });
    expect(parsed.size).toBeNull();
    expect(parsed.availableFrom).toBeNull();
    expect(parsed.features).toEqual([]);
  });

  it("reports each field with a translatable key", () => {
    const result = roomSchema.safeParse({
      name: "",
      price: "0",
      deposit: "-1",
      size: "0",
      status: "reserved",
      availableFrom: "2026-02-30",
      features: ["swimming_pool"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      name: "required",
      price: "priceZero",
      deposit: "amountInvalid",
      size: "sizeInvalid",
      status: "statusInvalid",
      availableFrom: "dateInvalid",
      features: "featureInvalid",
    });
  });

  it("requires a price and limits sizes to less than 1000 m²", () => {
    const missing = roomSchema.safeParse({ ...validRoom, price: " " });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(fieldErrorsFrom(missing.error)).toEqual({ price: "required" });
    }
    expect(roomSchema.safeParse({ ...validRoom, size: "999,9" }).success).toBe(
      true,
    );
    expect(roomSchema.safeParse({ ...validRoom, size: "1000" }).success).toBe(
      false,
    );
  });
});

describe("validation messages", () => {
  it("every issue of these schemas is a key of the validation messages", () => {
    const results = [
      propertySchema.safeParse({
        name: "x".repeat(101),
        address: "",
        city: "x".repeat(101),
        region: "",
        totalRentReference: "x",
      }),
      roomSchema.safeParse({
        name: "x".repeat(101),
        price: "",
        deposit: "x",
        size: "x",
        status: "",
        availableFrom: "x",
        features: ["x", "balcony"],
      }),
      roomSchema.safeParse({ ...validRoom, price: "0" }),
    ];
    for (const result of results) {
      expect(result.success).toBe(false);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        expect(messages.validation).toHaveProperty(issue.message);
      }
    }
  });
});
