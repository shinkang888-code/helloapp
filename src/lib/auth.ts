import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const kakaoProvider =
  process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
    ? [
        Kakao({
          clientId: process.env.KAKAO_CLIENT_ID,
          clientSecret: process.env.KAKAO_CLIENT_SECRET,
          authorization: {
            params: {
              scope: "profile_nickname account_email talk_message",
              prompt: "consent",
            },
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Production에서는 반드시 Secure cookie를 사용하고,
  // 로컬/프록시 개발 환경에서만 일반 cookie를 허용한다.
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          });

          if (!user || !user.password) return null;
          if (!user.isActive) return null;

          const isValid = await bcrypt.compare(
            parsed.data.password,
            user.password
          );
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "",
            role: user.role as string,
            image: user.profileImage ?? null,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
    ...kakaoProvider,
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "kakao") return true;

      const email = user.email;
      if (!email) return false;

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser || !dbUser.isActive) return false;

      const kakaoId = account.providerAccountId;
      const expiresInSeconds = account.expires_at
        ? Math.max(account.expires_at - Math.floor(Date.now() / 1000), 0)
        : 21600;

      if (account.access_token && account.refresh_token) {
        await prisma.kakaoLink.upsert({
          where: { userId: dbUser.id },
          update: {
            kakaoId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
            scopes: account.scope?.split(" ").filter(Boolean) ?? [],
          },
          create: {
            userId: dbUser.id,
            kakaoId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
            scopes: account.scope?.split(" ").filter(Boolean) ?? [],
          },
        });
      }

      if (!dbUser.profileImage && user.image) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { profileImage: user.image },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profileImage: true,
            isActive: true,
          },
        });

        if (dbUser?.isActive) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name ?? "";
          token.email = dbUser.email;
          token.picture = dbUser.profileImage ?? user?.image ?? null;
          return token;
        }
      }

      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "STUDENT";
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.name = (token.name as string) ?? "";
        session.user.email = (token.email as string) ?? "";
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
});
