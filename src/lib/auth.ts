import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "./db";

export const auth = betterAuth({
  appName: "GitHub Kanban",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: { enabled: false },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "unconfigured",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "unconfigured",
      disableDefaultScope: true,
      scope: [],
    },
  },
  account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
  plugins: [nextCookies()],
});
