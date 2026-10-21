import { z } from "zod";

// Room tokens are 32 hex characters (rooms.public_token).
export const roomTokenSchema = z.string().regex(/^[0-9a-f]{32}$/);

export const applicationIdSchema = z.uuid();
