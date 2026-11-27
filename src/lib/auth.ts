import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { getPrisma } from "@/lib/prisma";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;

  if (!secret || !baseURL) {
    throw new Error(
      "Authentication is not configured. Copy .env.example to .env and set BETTER_AUTH_SECRET and BETTER_AUTH_URL.",
    );
  }

  return betterAuth({
    baseURL,
    secret,
    database: prismaAdapter(getPrisma(), {
      provider: "postgresql",
    }),
    plugins: [
      admin({
        defaultRole: "customer",
        adminRoles: ["admin"],
      }),
    ],
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
        },
        adminRoleId: {
          type: "string",
          required: false,
          input: false,
        },
        role: {
          type: "string",
          required: true,
          defaultValue: "customer",
          input: false,
        },
        passwordChangeRequired: {
          type: "boolean",
          required: true,
          defaultValue: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const userCount = await getPrisma().user.count();

            return {
              data: {
                ...user,
                role: userCount === 0 ? "admin" : "customer",
              },
            };
          },
        },
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
