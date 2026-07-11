import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Provider } from "next-auth/providers";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (
    !value ||
    value.startsWith("replace_with_") ||
    value.startsWith("dummy_")
  ) {
    throw new Error(`Missing or invalid environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name];

  if (
    !value ||
    value.startsWith("replace_with_") ||
    value.startsWith("dummy_")
  ) {
    return null;
  }

  return value;
}

const googleClientId = getOptionalEnv("AUTH_GOOGLE_ID");
const googleClientSecret = getOptionalEnv("AUTH_GOOGLE_SECRET");

export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
});

const providers: Provider[] = [
  Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsedCredentials = credentialsSchema.safeParse(rawCredentials);

      if (!parsedCredentials.success) {
        return null;
      }

      const { email, password } = parsedCredentials.data;
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (isGoogleAuthEnabled) {
  providers.unshift(
    Google({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: getRequiredEnv("AUTH_SECRET"),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
