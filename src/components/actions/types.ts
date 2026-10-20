import type { ErrorKey } from "@/lib/errors";

// Result of a one-click Server Action (no form fields).
export type ActionResult =
  { status: "success" } | { status: "error"; error: ErrorKey };
