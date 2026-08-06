interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  AUTH_SECRET: string;
  AUTH_GOOGLE_ID: string;
  AUTH_GOOGLE_SECRET: string;
  AUTH_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  ADMIN_EMAILS?: string;
}
