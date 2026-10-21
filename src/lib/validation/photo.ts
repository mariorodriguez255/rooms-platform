import { z } from "zod";

import { MAX_PHOTO_DIMENSION } from "@/lib/photos/constraints";

// Fields that come with each uploaded photo. The file itself is checked in
// the Server Action (size and JPEG signature).

const dimensionSchema = z.coerce.number().int().min(1).max(MAX_PHOTO_DIMENSION);

export const photoUploadSchema = z.object({
  propertyId: z.uuid(),
  // Empty: a photo of the common areas of the property.
  roomId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  width: dimensionSchema,
  height: dimensionSchema,
});

export const photoIdSchema = z.uuid();
