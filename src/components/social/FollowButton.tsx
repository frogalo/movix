"use client";

import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  className?: string;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  className = "",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
        isFollowing
          ? "bg-zinc-800 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/30 border border-white/10 text-zinc-300"
          : "bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(255,204,0,0.3)]"
      } disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-3.5 h-3.5" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}