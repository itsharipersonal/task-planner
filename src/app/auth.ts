import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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
  };
});
