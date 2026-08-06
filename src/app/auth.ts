import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  bootstrapSuperAdmin,
  loadUserAccess,
  parseAdminEmails,
} from "@/lib/admin/user-access";
import type { UserRole, UserStatus } from "@/types/admin";

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const { env } = await getCloudflareContext({ async: true });
  const secret = env.AUTH_SECRET ?? process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is missing. Add it to .dev.vars for preview/deploy or .env.local for next dev.",
    );
  }

  return {
    providers: [
      Google({
        clientId: (env.AUTH_GOOGLE_ID ?? process.env.AUTH_GOOGLE_ID)!,
        clientSecret: (env.AUTH_GOOGLE_SECRET ?? process.env.AUTH_GOOGLE_SECRET)!,
      }),
    ],
    adapter: D1Adapter(env.DB),
    secret,
    trustHost: true,
    pages: {
      signIn: "/",
    },
    events: {
      async createUser({ user }) {
        if (!user.id) return;
        await bootstrapSuperAdmin(env.DB, env, user.id, user.email ?? null);
        const admins = parseAdminEmails(env);
        if (user.email && admins.includes(user.email.toLowerCase())) {
          await env.DB.prepare(
            "UPDATE users SET role = 'super_admin', updated_at = datetime('now') WHERE id = ?",
          )
            .bind(user.id)
            .run();
        }
      },
    },
    callbacks: {
      async signIn({ user }) {
        if (!user.id) return false;
        await bootstrapSuperAdmin(env.DB, env, user.id, user.email ?? null);
        const access = await loadUserAccess(env.DB, user.id);
        if (!access) return true;
        if (access.status === "blocked" || access.status === "deleted") {
          return false;
        }
        return true;
      },
      async session({ session, user }) {
        if (session.user && user?.id) {
          session.user.id = user.id;
          const access = await loadUserAccess(env.DB, user.id);
          session.user.role = (access?.role ?? "user") as UserRole;
          session.user.status = (access?.status ?? "active") as UserStatus;
        }
        return session;
      },
    },
  };
});
