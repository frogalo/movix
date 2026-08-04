"use client";

import { useState } from 'react';
import { ImageWithLoader } from './ImageWithLoader';

export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const emailPrefix = email.split('@')[0];
    const parts = emailPrefix.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailPrefix.slice(0, 2).toUpperCase();
  }
  return 'MX';
}

interface UserAvatarProps {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
}

export function UserAvatar({
  image,
  name,
  email,
  sizeClassName = "w-9 h-9",
  textClassName = "text-xs",
  className = "",
}: UserAvatarProps) {
  const [imageError, _setImageError] = useState(false);
  const initials = getInitials(name, email);

  if (image && !imageError) {
    return (
      <ImageWithLoader
        src={image}
        alt={name || "User Avatar"}
        className={`w-full h-full rounded-full object-cover ${className}`}
        wrapperClassName={`${sizeClassName} rounded-full border-2 border-yellow-400/30 hover:border-yellow-400/60 transition-colors shrink-0 shadow-md`}
        loaderSize={14}
        fallback={
          <div className={`${sizeClassName} rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-yellow-400/40 flex items-center justify-center font-avatar-initials text-yellow-400 ${textClassName} ${className} shrink-0 shadow-md`}>
            {initials}
          </div>
        }
      />
    );
  }

  return (
    <div className={`${sizeClassName} rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-yellow-400/40 flex items-center justify-center font-avatar-initials text-yellow-400 ${textClassName} ${className} shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}
