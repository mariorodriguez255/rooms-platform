import type { Database } from "@/types/database";

// What each role may do, used to show or hide controls. It mirrors the
// rules enforced by the database (RLS policies and the guard_member_change
// trigger); the database is what actually protects the data.
//
//   staff  day-to-day work: create and edit properties and rooms, add and
//          remove photos (candidates… from milestone 3)
//   admin  + delete properties and rooms, organization settings and
//          members (except owners)
//   owner  + owners and billing (milestone 7)

export type MemberRole = Database["public"]["Enums"]["member_role"];

export const MEMBER_ROLES = [
  "owner",
  "admin",
  "staff",
] as const satisfies readonly MemberRole[];

// Ownership is handed over to an existing member, never by invitation.
export const INVITABLE_ROLES = [
  "admin",
  "staff",
] as const satisfies readonly MemberRole[];

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

function isManager(role: MemberRole): boolean {
  return role === "owner" || role === "admin";
}

export function canEditOrganization(role: MemberRole): boolean {
  return isManager(role);
}

export function canManageMembers(role: MemberRole): boolean {
  return isManager(role);
}

// Deleting a property or a room also deletes everything that hangs from it.
export function canDeletePropertiesAndRooms(role: MemberRole): boolean {
  return isManager(role);
}

// Roles that `actor` can give to a member who currently has `target`.
// Empty when the actor cannot change that member's role at all.
export function assignableRoles(
  actor: MemberRole,
  target: MemberRole,
): MemberRole[] {
  if (actor === "owner") return [...MEMBER_ROLES];
  if (actor === "admin" && target !== "owner") return ["admin", "staff"];
  return [];
}

// Removing someone else. Leaving (removing yourself) is always offered; the
// database still refuses it for the last owner.
export function canRemoveMember(
  actor: MemberRole,
  target: MemberRole,
): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "owner";
  return false;
}
