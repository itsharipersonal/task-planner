import type { AdminAction, UserRole } from "@/types/admin";
import { ROLE_HIERARCHY } from "@/types/admin";

export function isRoleAtLeast(
  role: UserRole | undefined | null,
  minimum: UserRole,
): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

const ACTION_MIN_ROLE: Record<AdminAction, UserRole> = {
  "users.view": "moderator",
  "users.edit": "admin",
  "users.block": "admin",
  "users.delete": "super_admin",
  "users.change_role": "admin",
  "categories.manage": "admin",
  "templates.manage": "admin",
  "attempts.view": "moderator",
  "attempts.review": "moderator",
  "badges.manage": "admin",
  "leaderboard.manage": "admin",
  "prompts.manage": "admin",
  "notifications.send": "admin",
  "analytics.view": "admin",
  "settings.manage": "super_admin",
  "audit.view": "super_admin",
};

export function can(role: UserRole | undefined | null, action: AdminAction): boolean {
  const minimum = ACTION_MIN_ROLE[action];
  return isRoleAtLeast(role, minimum);
}

export function canAssignRole(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") {
    return targetRole !== "super_admin" && targetRole !== "admin";
  }
  return false;
}

export function adminPanelRole(role: UserRole | undefined | null): boolean {
  return isRoleAtLeast(role, "moderator");
}
