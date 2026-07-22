"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className,
  label = "Sign Out",
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {label}
    </button>
  );
}
