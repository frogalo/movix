"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Clapperboard, Star, BookmarkCheck, Users, User } from "lucide-react";

export function BottomNavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const homeHref = "/trending";
  const [showTopRated, setShowTopRated] = useState(false);

  useEffect(() => {
    const checkSetting = () => {
      if (typeof window !== "undefined") {
        const val = localStorage.getItem("movix_show_top_rated_mobile");
        setShowTopRated(val === "true");
      }
    };

    checkSetting();
    window.addEventListener("storage", checkSetting);
    window.addEventListener("movix-settings-changed", checkSetting);

    return () => {
      window.removeEventListener("storage", checkSetting);
      window.removeEventListener("movix-settings-changed", checkSetting);
    };
  }, []);

  const isActive = (path: string) =>
    path === "/trending"
      ? (pathname === "/" || pathname === "/trending")
      : (path === "/" ? pathname === path : pathname.startsWith(path));

  const linkClass = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 ${showTopRated ? 'w-14' : 'w-16'} h-12 rounded-xl transition-colors touch-manipulation ${
      isActive(path) ? "text-yellow-400" : "text-zinc-500 active:text-zinc-300"
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-zinc-950/70 backdrop-blur-2xl border-t border-white/10 z-[60] flex justify-around items-center px-1 pt-2 pb-2 safe-bottom">
      <Link href={homeHref} className={linkClass(homeHref)}>
        <Clapperboard className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wide">Home</span>
      </Link>
      {showTopRated && (
        <Link href="/top-rated" className={linkClass("/top-rated")}>
          <Star className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wide truncate">Top Rated</span>
        </Link>
      )}
      <Link href="/library" className={linkClass("/library")}>
        <BookmarkCheck className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wide">Library</span>
      </Link>
      <Link href="/social" className={linkClass("/social")}>
        <Users className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wide">Social</span>
      </Link>
      <Link href="/profile" className={linkClass("/profile")}>
        <User className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wide">Account</span>
      </Link>
    </nav>
  );
}
