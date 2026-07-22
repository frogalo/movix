"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ImageWithLoader } from "@/components/common/ImageWithLoader";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200";

interface NotificationItem {
  id: string;
  type: "follow" | "tv_premiere" | "movie_premiere";
  title: string;
  message: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  media?: {
    id: number;
    title: string;
    posterPath: string | null;
    mediaType: "movie" | "tv";
    extraInfo?: string;
  };
  link: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const list: NotificationItem[] = data.notifications || [];
        setNotifications(list);

        const lastRead = localStorage.getItem("movix_notifications_last_read");
        const lastReadTimestamp = lastRead ? new Date(lastRead).getTime() : 0;

        const unread = list.filter(
          (n) => new Date(n.timestamp).getTime() > lastReadTimestamp
        ).length;

        setUnreadCount(unread);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open) {
      localStorage.setItem("movix_notifications_last_read", new Date().toISOString());
      setUnreadCount(0);
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Unread Badge */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
        title="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(255,204,0,0.6)] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass-panel border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl p-4 z-[100] space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400 text-xl">notifications</span>
              <h3 className="font-bold text-white text-sm">Notifications</h3>
            </div>
            <button
              type="button"
              onClick={fetchNotifications}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <span className={`material-symbols-outlined text-[14px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 hide-scrollbar">
            {notifications.length === 0 && !loading && (
              <div className="text-center py-8 text-zinc-500">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">notifications_off</span>
                <p className="text-xs font-semibold text-zinc-400">No notifications</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Follow members or track shows to receive updates.</p>
              </div>
            )}

            {notifications.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                onClick={() => setOpen(false)}
                className="flex items-stretch overflow-hidden rounded-xl border border-white/5 hover:border-yellow-400/20 hover:bg-white/5 transition group"
              >
                {/* Left Thumbnail (Avatar or Media Cover) - Spans flush top to bottom */}
                <div className="w-14 shrink-0 relative self-stretch bg-zinc-900 border-r border-white/5 overflow-hidden flex items-center justify-center">
                  {item.type === "follow" && item.user ? (
                    <UserAvatar
                      image={item.user.image}
                      name={item.user.name}
                      sizeClassName="w-full h-full rounded-none"
                      textClassName="text-[12px]"
                      className="rounded-none w-full h-full object-cover"
                    />
                  ) : item.media?.posterPath ? (
                    <ImageWithLoader
                      src={TMDB_IMAGE_BASE + item.media.posterPath}
                      alt={item.media.title}
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full h-full"
                      loaderSize={8}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-zinc-500 text-lg">
                      {item.type === "follow" ? "person_add" : item.type === "tv_premiere" ? "live_tv" : "movie"}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-2.5 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          item.type === "follow"
                            ? "text-yellow-400"
                            : item.type === "tv_premiere"
                            ? "text-teal-400"
                            : "text-purple-400"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500 font-mono">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-white group-hover:text-yellow-300 transition-colors leading-snug">
                      {item.type === "follow" ? (
                        <span>
                          <strong className="text-yellow-400 font-semibold">{item.user?.name ?? "A member"}</strong> started following you
                        </span>
                      ) : item.type === "tv_premiere" ? (
                        <span>
                          <strong className="text-white font-semibold">{item.media?.title}</strong>
                        </span>
                      ) : (
                        <span>
                          <strong className="text-white font-semibold">{item.media?.title}</strong> premiered
                        </span>
                      )}
                    </p>

                    {/* Formatted Season & Episode Badge for TV Premieres */}
                    {item.type === "tv_premiere" && item.media?.extraInfo && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                          {item.media.extraInfo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}