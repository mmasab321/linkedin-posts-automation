import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          onboardingComplete: user.onboardingComplete,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
      }
      if (token.sub) {
        const u = await prisma.user.findUnique({ where: { id: token.sub }, select: { onboardingComplete: true, isAdmin: true } });
        if (u) {
          token.onboardingComplete = u.onboardingComplete;
          token.isAdmin = u.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.onboardingComplete = token.onboardingComplete as boolean | undefined;
        session.user.isAdmin = token.isAdmin as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
});

declare module "next-auth" {
  interface Session {
    user: { id: string; email?: string | null; name?: string | null; onboardingComplete?: boolean; isAdmin?: boolean };
  }
}
