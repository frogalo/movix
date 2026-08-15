export default function ProfileLoading() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12 animate-pulse">
      {/* Background glow placeholder */}
      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1]/30 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#ffcc00]/20 blur-[100px]" />
        </div>

        {/* User Hero Skeleton */}
        <div className="relative z-10 mx-auto mt-4 md:mt-12 flex max-w-7xl flex-col items-center gap-6 md:gap-8 md:flex-row md:items-start">
          {/* Avatar Skeleton */}
          <div className="relative">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-2 border-yellow-400/20 bg-zinc-800/80 p-1 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-zinc-700/50" />
            </div>
          </div>

          {/* User Details Skeleton */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
            {/* Name */}
            <div className="h-9 w-52 md:w-64 bg-zinc-800 rounded-xl" />
            
            {/* Email & Badge */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="h-4 w-44 bg-zinc-800/80 rounded-md" />
              <div className="h-6 w-32 bg-zinc-800/60 rounded-full border border-white/5" />
            </div>

            {/* Member since */}
            <div className="h-4 w-48 bg-zinc-800/50 rounded-md pt-1" />
          </div>

          {/* Action Button Skeleton */}
          <div className="mt-4 md:mt-0">
            <div className="h-11 w-32 rounded-lg bg-zinc-800/60 border border-white/5" />
          </div>
        </div>
      </section>

      {/* Content Skeleton */}
      <section className="mx-auto max-w-[1600px] space-y-8 md:space-y-12 px-4 md:px-12 pb-28 md:pb-24">
        {/* Statistics section */}
        <div>
          {/* Section Header */}
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20" />
              <div className="h-7 w-48 bg-zinc-800 rounded-lg" />
            </div>
            <div className="h-4 w-32 bg-zinc-800/60 rounded" />
          </div>

          {/* 5 Stats Cards Grid Skeleton */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="glass-panel space-y-3 rounded-2xl p-6 relative overflow-hidden bg-zinc-900/60 border border-white/5 h-44 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-zinc-700/60 rounded" />
                  <div className="h-8 w-36 bg-zinc-700/80 rounded-lg" />
                </div>
                <div className="h-3 w-full bg-zinc-800/80 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Profile Actions / Settings Section Skeleton */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 bg-zinc-900/40 border border-white/5">
          <div className="h-6 w-44 bg-zinc-800 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 rounded-xl bg-zinc-800/40 border border-white/5" />
            <div className="h-24 rounded-xl bg-zinc-800/40 border border-white/5" />
            <div className="h-24 rounded-xl bg-zinc-800/40 border border-white/5" />
          </div>
        </div>
      </section>
    </main>
  );
}
