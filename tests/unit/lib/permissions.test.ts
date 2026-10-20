import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  canEditOrganization,
  canManageMembers,
  canRemoveMember,
  INVITABLE_ROLES,
} from "@/lib/auth/permissions";

// The role matrix approved for milestone 1. It mirrors the database rules
// (supabase/tests/011_members.test.sql), which are the real protection.
describe("role matrix", () => {
  it("lets owners and admins edit the organization and manage members", () => {
    expect(canEditOrganization("owner")).toBe(true);
    expect(canEditOrganization("admin")).toBe(true);
    expect(canEditOrganization("staff")).toBe(false);
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("staff")).toBe(false);
  });

  it("lets only owners make or touch owners", () => {
    expect(assignableRoles("owner", "staff")).toEqual([
      "owner",
      "admin",
      "staff",
    ]);
    expect(assignableRoles("owner", "owner")).toEqual([
      "owner",
      "admin",
      "staff",
    ]);
    expect(assignableRoles("admin", "staff")).toEqual(["admin", "staff"]);
    expect(assignableRoles("admin", "owner")).toEqual([]);
    expect(assignableRoles("staff", "staff")).toEqual([]);
  });

  it("lets owners remove anyone and admins anyone but owners", () => {
    expect(canRemoveMember("owner", "owner")).toBe(true);
    expect(canRemoveMember("admin", "admin")).toBe(true);
    expect(canRemoveMember("admin", "staff")).toBe(true);
    expect(canRemoveMember("admin", "owner")).toBe(false);
    expect(canRemoveMember("staff", "staff")).toBe(false);
  });

  it("never invites owners", () => {
    expect(INVITABLE_ROLES).not.toContain("owner");
  });
});
