export type UserRole = "user" | "moderator" | "admin" | "super_admin";
export type UserStatus = "active" | "blocked" | "deleted";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export type AdminAction =
  | "users.view"
  | "users.edit"
  | "users.block"
  | "users.delete"
  | "users.change_role"
  | "categories.manage"
  | "templates.manage"
  | "attempts.view"
  | "attempts.review"
  | "badges.manage"
  | "leaderboard.manage"
  | "prompts.manage"
  | "notifications.send"
  | "analytics.view"
  | "settings.manage"
  | "audit.view";
