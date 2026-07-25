"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, UserSearch, Users } from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";

interface User {
  id: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  isFollowing: boolean;
  _count: {
    ratings: number;
    tvShows: number;
  };
}

export default function SocialSearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setUsers([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/social/search?q=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setSearched(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-y-auto pb-24 md:ml-64 md:w-[calc(100%-16rem)] md:pb-12">
      <section className="relative overflow-hidden px-6 pb-8 pt-24 md:px-12 md:pt-16">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[#571bc1] blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[300px] rounded-full bg-[#00daf3] blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-white font-['Space_Grotesk'] mb-2">
              Find Friends
            </h1>
            <p className="text-zinc-400 text-sm">Search for other Movix users to follow their watching activity.</p>
          </div>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-4 py-4 text-white placeholder-zinc-500 outline-none focus:border-yellow-400/40 focus:bg-white/8 transition text-sm"
              autoFocus
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
            )}
          </div>

          {searched && users.length === 0 && !loading && (
            <div className="text-center py-16 text-zinc-500">
              <UserSearch className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">No public users found matching &quot;{query}&quot;</p>
            </div>
          )}

          {!searched && !loading && (
            <div className="text-center py-16 text-zinc-600">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">Start typing to find other members</p>
            </div>
          )}

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 rounded-2xl glass-panel border border-white/5 hover:border-yellow-400/20 hover:bg-white/5 transition-all group"
              >
                <Link href={`/users/${user.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <UserAvatar
                    image={user.image}
                    name={user.name}
                    sizeClassName="w-12 h-12"
                    textClassName="text-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white group-hover:text-yellow-400 transition-colors truncate">
                      {user.name ?? "Movix Member"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {user._count.ratings} movies · {user._count.tvShows} shows
                    </p>
                  </div>
                </Link>

                <FollowButton
                  targetUserId={user.id}
                  initialIsFollowing={user.isFollowing}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}