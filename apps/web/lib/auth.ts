import { betterAuth } from "better-auth"
import { pool, db } from "@crm/db"
import { user as userTable } from "@crm/db"
import { sql } from "drizzle-orm"

export const auth = betterAuth({
  database: pool,
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          // Bootstrap: the very first registered account becomes an approved admin
          // so there is someone who can approve everyone else.
          const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(userTable)
          const isFirstUser = Number(count) === 0
          if (isFirstUser) {
            return {
              data: {
                ...newUser,
                role: "admin",
                status: "approved",
                requestedRole: "admin",
              },
            }
          }
          return { data: newUser }
        },
      },
    },
  },
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "sales",
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "pending",
        input: false,
      },
      requestedRole: {
        type: "string",
        required: false,
        defaultValue: "sales",
        input: true,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // v0 preview is served from dynamic subdomains; trust the known preview
    // hosts (wildcards) so sign-in callbacks and sign-out (CSRF-protected)
    // succeed regardless of the exact preview origin.
    "https://*.vusercontent.net",
    "https://*.v0.dev",
    "https://*.v0.app",
    "https://*.vercel.app",
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
