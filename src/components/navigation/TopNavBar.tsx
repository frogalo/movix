"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";

export function TopNavBar() {
  const { data: session } = useSession();
  const landingHref = session?.user ? "/library" : "/";

  return (
    <nav className="md:hidden bg-zinc-950/70 backdrop-blur-2xl fixed w-full top-0 z-[60] border-b border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] pt-[env(safe-area-inset-top,0px)] px-4">
      <div className="h-16 flex justify-between items-center w-full">
        <Link href={landingHref} className="text-2xl font-black italic tracking-tighter text-yellow-400 drop-shadow-[0_0_8px_rgba(255,204,0,0.5)] font-['Space_Grotesk']">
          movix
        </Link>
        <button
          onClick={() => window.dispatchEvent(new Event('open-mobile-search'))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 active:bg-white/15 transition-colors touch-manipulation"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
