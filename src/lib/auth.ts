import { auth } from "@/app/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

type AuthFailure = { error: NextResponse };
type AuthSuccess = { userId: string; email: string | null };

export async function requireUserId(): Promise<AuthFailure | AuthSuccess> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId: session.user.id, email: session.user.email ?? null };
}

export function isAdminEmail(env: CloudflareEnv, email: string | null): boolean {
  if (!email) return false;
  const admins = (env.ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<
  AuthFailure | (AuthSuccess & { env: CloudflareEnv })
> {
  const result = await requireUserId();
  if ("error" in result) return result;
  const env = await getEnv();
  if (!isAdminEmail(env, result.email)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ...result, env };
}
