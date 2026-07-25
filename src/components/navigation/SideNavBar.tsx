"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Clapperboard, Star, Library, Users, User } from "lucide-react";

export function SideNavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const landingHref = session?.user ? "/library" : "/";
  const homeHref = session?.user ? "/trending" : "/";

  const isActive = (path: string) =>
    path === "/" ? pathname === path : pathname.startsWith(path);

  const baseLinkStyle = "flex items-center gap-4 px-4 py-3 hover:bg-white/5 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 rounded-lg";
  const activeLinkStyle = "bg-yellow-400/10 text-yellow-400 border-l-4 border-yellow-400 rounded-lg";
  const inactiveLinkStyle = "text-zinc-500 hover:text-zinc-200";

  return (
    <aside className="hidden md:flex flex-col h-full py-8 space-y-8 bg-zinc-900/80 backdrop-blur-2xl w-64 border-r border-white/5 shadow-2xl fixed left-0 top-0 z-40">
      <div className="px-6 pb-8 border-b border-white/10">
        <Link 
          href={landingHref} 
          className="text-3xl font-black italic tracking-tighter text-yellow-400 drop-shadow-[0_0_8px_rgba(255,204,0,0.5)] font-['Space_Grotesk'] hover:opacity-80 transition-opacity block"
        >
          movix
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-2 font-['Space_Grotesk'] font-medium">
        <Link href={homeHref} className={`${baseLinkStyle} ${isActive(homeHref) ? activeLinkStyle : inactiveLinkStyle}`}>
          <Clapperboard className="w-5 h-5" />
          Home
        </Link>
        <Link href="/top-rated" className={`${baseLinkStyle} ${isActive('/top-rated') ? activeLinkStyle : inactiveLinkStyle}`}>
          <Star className="w-5 h-5" />
          Top Rated
        </Link>
        <Link href="/library" className={`${baseLinkStyle} ${isActive('/library') ? activeLinkStyle : inactiveLinkStyle}`}>
          <Library className="w-5 h-5" />
          Library
        </Link>
        <Link href="/social" className={`${baseLinkStyle} ${isActive('/social') ? activeLinkStyle : inactiveLinkStyle}`}>
          <Users className="w-5 h-5" />
          Social
        </Link>
        <Link href="/profile" className={`${baseLinkStyle} ${isActive('/profile') ? activeLinkStyle : inactiveLinkStyle}`}>
          <User className="w-5 h-5" />
          Profile
        </Link>
      </nav>
    </aside>
  );
}
