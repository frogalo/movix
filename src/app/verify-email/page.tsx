import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata = {
  title: "Verify Email — Movix",
  description: "Confirm your Movix email address",
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let status: "success" | "invalid" | "expired" | "missing" = "missing";

  if (token) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      status = "invalid";
    } else if (record.expires < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      status = "expired";
    } else {
      await prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      });
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      status = "success";
    }
  }

  const content = {
    success: {
      icon: "✅",
      title: "Email verified!",
      body: "Your Movix account is now fully verified. Enjoy the show.",
      cta: "Go to profile",
      href: "/profile",
      accent: "text-emerald-400",
    },
    expired: {
      icon: "⏰",
      title: "Link expired",
      body: "This verification link has expired (24-hour limit). Request a new one from your profile.",
      cta: "Back to profile",
      href: "/profile",
      accent: "text-amber-400",
    },
    invalid: {
      icon: "❌",
      title: "Invalid link",
      body: "This verification link is not recognised. It may have already been used.",
      cta: "Back to profile",
      href: "/profile",
      accent: "text-rose-400",
    },
    missing: {
      icon: "🔗",
      title: "No token",
      body: "No verification token was provided. Check the link in your email.",
      cta: "Back to home",
      href: "/",
      accent: "text-zinc-400",
    },
  }[status];

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 md:ml-64 md:w-[calc(100%-16rem)]">
      {/* background glows */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute left-[10%] top-[15%] h-64 w-64 rounded-full bg-[#571bc1] blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] h-72 w-72 rounded-full bg-[#ffcc00] blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-4 text-5xl">{content.icon}</div>
          <h1 className={`text-2xl font-bold mb-3 ${content.accent}`}>
            {content.title}
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">{content.body}</p>
          <Link
            href={content.href}
            className="inline-block rounded-full bg-yellow-400 px-8 py-3 text-sm font-bold text-zinc-950 transition hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]"
          >
            {content.cta}
          </Link>
        </div>
      </div>
    </main>
  );
}
