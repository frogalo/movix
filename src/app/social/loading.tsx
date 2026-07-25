export default function SocialLoading() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      <section className="relative overflow-hidden px-6 pb-8 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-[#571bc1] blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-[#ffcc00] blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="h-10 w-32 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-10 w-36 rounded-xl bg-yellow-400/5 border border-yellow-400/10 animate-pulse self-start sm:self-auto" />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-4 pt-2 pb-3 mb-4">
                <div className="h-3 w-20 rounded bg-yellow-400/10 animate-pulse" />
                <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-400/15 via-white/5 to-transparent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col lg:flex-row">
                    {/* Cover skeleton */}
                    <div className="w-full lg:w-44 xl:w-52 shrink-0 aspect-[16/9] lg:aspect-auto lg:min-h-[180px] bg-zinc-900 animate-pulse" />
                    {/* Content skeleton */}
                    <div className="flex-1 p-4 lg:p-5 bg-zinc-950/80 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                          <div className="h-4 w-36 rounded bg-white/5 animate-pulse" />
                        </div>
                        <div className="h-3 w-10 rounded bg-white/5 animate-pulse" />
                      </div>
                      <div className="hidden lg:flex items-center justify-between gap-3">
                        <div className="h-6 w-48 rounded-lg bg-white/5 animate-pulse" />
                        <div className="h-8 w-20 rounded-xl bg-amber-500/5 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        <div className="h-5 w-24 rounded-full bg-emerald-500/5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 pt-2 pb-3 mb-4">
                <div className="h-3 w-24 rounded bg-yellow-400/10 animate-pulse" />
                <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-400/15 via-white/5 to-transparent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[5, 6].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col lg:flex-row">
                    <div className="w-full lg:w-44 xl:w-52 shrink-0 aspect-[16/9] lg:aspect-auto lg:min-h-[180px] bg-zinc-900/70 animate-pulse" />
                    <div className="flex-1 p-4 lg:p-5 bg-zinc-950/80 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                          <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
                        </div>
                        <div className="h-3 w-12 rounded bg-white/5 animate-pulse" />
                      </div>
                      <div className="hidden lg:flex items-center justify-between gap-3">
                        <div className="h-6 w-44 rounded-lg bg-white/5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
