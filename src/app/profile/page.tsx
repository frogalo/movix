import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { prisma } from "@/lib/prisma";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ProfileStatsSection, ProfileStatsSkeleton } from "@/components/profile/ProfileStatsSection";

export const dynamic = 'force-dynamic';

export default async function Profile() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      isPrivate: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  const joinedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  const isVerified = !!user.emailVerified || (user.email ? user.email.toLowerCase().endsWith("@gmail.com") : false);

  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00] blur-[100px] mix-blend-screen" />
        </div>

        <div className="relative z-10 mx-auto mt-4 md:mt-12 flex max-w-7xl flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          <div className="relative group">
            <div className="relative z-10 h-32 w-32 overflow-hidden rounded-full border-2 border-yellow-400/30 bg-zinc-950 p-1 shadow-[0_0_30px_rgba(255,204,0,0.15)] md:h-40 md:w-40 flex items-center justify-center">
              <UserAvatar
                image={user.image}
                name={user.name}
                email={user.email}
                sizeClassName="w-full h-full"
                textClassName="text-3xl md:text-5xl"
                className="w-full h-full"
              />
            </div>
            <div className="absolute inset-0 -z-10 rounded-full bg-[#ffcc00] opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="mb-2 font-headline-lg text-[28px] md:text-headline-lg text-[#ffedc3] drop-shadow-lg">
              {user.name ?? "movix member"}
            </h2>
            <div className="flex flex-col items-center md:items-start gap-2 mb-4">
              <p className="font-body-md md:font-body-lg text-[14px] md:text-body-lg text-zinc-400">{user.email}</p>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  Verified Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    gpp_maybe
                  </span>
                  Pending Verification
                </span>
              )}
            </div>
            <p className="mb-4 md:mb-6 max-w-2xl font-body-md md:font-body-lg text-[13px] md:text-body-lg text-zinc-400">
              Account active since {joinedDate}.
            </p>
          </div>
          <div className="mt-4 flex flex-row gap-3 md:mt-0 md:flex-col">
            <SignOutButton
              className="glass-panel flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-label-sm text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
              label="Sign Out"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-8 md:space-y-12 px-4 md:px-12 pb-28 md:pb-24">
        {/* Statistics section with Suspense */}
        <Suspense fallback={<ProfileStatsSkeleton />}>
          <ProfileStatsSection userId={userId} />
        </Suspense>

        {/* User Account Settings, Import & Export Actions */}
        <ProfileActions initialIsPrivate={user.isPrivate} />
      </section>
    </main>
  );
}
