import { z } from "zod";

import { INVITABLE_ROLES, MEMBER_ROLES } from "@/lib/auth/permissions";
import { emailSchema } from "@/lib/validation/auth";

// Error messages are keys of the "validation" messages (see form.ts).

// Same limits as the check constraint on organizations.name.
export const organizationNameSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(100, "tooLong");

export const organizationSchema = z.object({
  name: organizationNameSchema,
});

export const invitationSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES, "roleInvalid"),
});

export const changeRoleSchema = z.object({
  memberId: z.uuid(),
  role: z.enum(MEMBER_ROLES, "roleInvalid"),
});

export const memberIdSchema = z.object({
  memberId: z.uuid(),
});

export const invitationIdSchema = z.object({
  invitationId: z.uuid(),
});

export const organizationIdSchema = z.object({
  orgId: z.uuid(),
});

// Invitation tokens are 64 hex characters (create_invitation()).
export const invitationTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
