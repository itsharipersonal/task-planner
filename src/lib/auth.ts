import { auth } from "@/app/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { adminPanelRole, isRoleAtLeast } from "@/lib/admin/permissions";
import { isAdminEmail } from "@/lib/admin/user-access";
import type { UserRole, UserStatus } from "@/types/admin";

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

type AuthFailure = { error: NextResponse };
type AuthSuccess = {
  userId: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
};

export async function requireUserId(): Promise<AuthFailure | AuthSuccess> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = session.user.role ?? "user";
  const status = session.user.status ?? "active";

  if (status === "blocked" || status === "deleted") {
    return {
      error: NextResponse.json({ error: "Account blocked" }, { status: 403 }),
    };
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    role,
    status,
  };
}

export async function requireRole(
  minimum: UserRole,
): Promise<AuthFailure | (AuthSuccess & { env: CloudflareEnv })> {
  const result = await requireUserId();
  if ("error" in result) return result;

  if (!isRoleAtLeast(result.role, minimum)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const env = await getEnv();
  return { ...result, env };
}

export async function requireModerator(): Promise<
  AuthFailure | (AuthSuccess & { env: CloudflareEnv })
> {
  return requireRole("moderator");
}

export async function requireAdmin(): Promise<
  AuthFailure | (AuthSuccess & { env: CloudflareEnv })
> {
  return requireRole("admin");
}

export async function requireSuperAdmin(): Promise<
  AuthFailure | (AuthSuccess & { env: CloudflareEnv })
> {
  return requireRole("super_admin");
}

export { adminPanelRole, isAdminEmail, isRoleAtLeast };
