"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
          <span className="material-symbols-outlined">movie_filter</span>
          Home
        </Link>
        {/* <Link href="/discovery" className={`${baseLinkStyle} ${isActive('/discovery') ? activeLinkStyle : inactiveLinkStyle}`}>
          <span className="material-symbols-outlined">swipe_vertical</span>
          Discovery
        </Link> */}
        <Link href="/library" className={`${baseLinkStyle} ${isActive('/library') ? activeLinkStyle : inactiveLinkStyle}`}>
          <span className="material-symbols-outlined">library_books</span>
          Library
        </Link>
        <Link href="/profile" className={`${baseLinkStyle} ${isActive('/profile') ? activeLinkStyle : inactiveLinkStyle}`}>
          <span className="material-symbols-outlined">person</span>
          Profile
        </Link>
      </nav>
    </aside>
  );
}
