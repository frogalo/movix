export default function UserProfileLoading() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden px-6 pb-10 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00] blur-[100px] mix-blend-screen" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl mt-4 md:mt-8 flex flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          {/* Avatar skeleton */}
          <div className="relative">
            <div className="h-32 w-32 rounded-full border-2 border-yellow-400/15 bg-zinc-900 animate-pulse md:h-40 md:w-40" />
            <div className="absolute inset-0 -z-10 rounded-full bg-[#ffcc00] opacity-10 blur-xl" />
          </div>

          {/* Name / meta skeleton */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <div className="h-10 w-56 rounded-xl bg-white/5 animate-pulse mx-auto md:mx-0" />
              <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse mx-auto md:mx-0" />
            </div>
            <div className="h-4 w-40 rounded bg-white/5 animate-pulse mx-auto md:mx-0" />
            <div className="h-3 w-24 rounded bg-white/5 animate-pulse mx-auto md:mx-0" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-10 px-4 md:px-12 pb-28">
        {/* Stats Section Skeleton */}
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-purple-400/20 animate-pulse" />
              <div className="h-6 w-44 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="h-3 w-28 rounded bg-[#00daf3]/10 animate-pulse" />
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Stat card skeletons — 5 cards matching the real layout */}
            {[
              { accent: "yellow-400", border: "yellow-400/10" },
              { accent: "teal-400", border: "teal-400/10" },
              { accent: "purple-400", border: "purple-400/10" },
              { accent: "[#9cf0ff]", border: "[#9cf0ff]/10" },
              { accent: "pink-400", border: "pink-400/10" },
            ].map((card, i) => (
              <div
                key={i}
                className={`glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden border border-white/[0.06]`}
              >
                <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
                <div className={`h-9 w-32 rounded-lg bg-${card.accent}/10 animate-pulse`} />
                <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Ratings Section Skeleton */}
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-amber-400/20 animate-pulse" />
              <div className="h-6 w-36 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Episodes Section Skeleton */}
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-teal-400/20 animate-pulse" />
              <div className="h-6 w-44 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl glass-panel border border-white/[0.06] p-4"
              >
                <div className="w-14 h-20 rounded-lg bg-zinc-900 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TV Shows Section Skeleton */}
        <div>
          <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-purple-400/20 animate-pulse" />
              <div className="h-6 w-32 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
