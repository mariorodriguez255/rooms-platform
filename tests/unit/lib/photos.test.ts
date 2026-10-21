import { describe, expect, it } from "vitest";

import {
  fitWithin,
  isJpeg,
  MAX_PHOTO_DIMENSION,
} from "@/lib/photos/constraints";
import { photoUploadSchema } from "@/lib/validation/photo";

describe("isJpeg", () => {
  it("checks the JPEG signature, not the file name or type", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(true);
    // PNG
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new TextEncoder().encode("<svg>"))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});

describe("fitWithin", () => {
  it("shrinks the long side to the maximum, keeping the aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: 2048 });
    expect(fitWithin(8000, 1000)).toEqual({ width: 2048, height: 256 });
  });

  it("never enlarges small images", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_PHOTO_DIMENSION, 10)).toEqual({
      width: MAX_PHOTO_DIMENSION,
      height: 10,
    });
  });

  it("keeps at least one pixel", () => {
    expect(fitWithin(100_000, 1)).toEqual({ width: 2048, height: 1 });
  });
});

describe("photoUploadSchema", () => {
  const base = {
    propertyId: "a1a1a1a1-0000-4000-8000-000000000001",
    roomId: "",
    width: "2048",
    height: "1536",
  };

  it("reads an empty room as a photo of the common areas", () => {
    expect(photoUploadSchema.parse(base)).toEqual({
      propertyId: base.propertyId,
      roomId: null,
      width: 2048,
      height: 1536,
    });
  });

  it("rejects ids that are not UUIDs and oversized dimensions", () => {
    expect(
      photoUploadSchema.safeParse({ ...base, roomId: "../x" }).success,
    ).toBe(false);
    expect(
      photoUploadSchema.safeParse({ ...base, propertyId: "x" }).success,
    ).toBe(false);
    expect(
      photoUploadSchema.safeParse({ ...base, width: "4096" }).success,
    ).toBe(false);
    expect(photoUploadSchema.safeParse({ ...base, height: "0" }).success).toBe(
      false,
    );
  });
});
