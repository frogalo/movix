"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { resendVerificationAction } from "@/app/login/actions";

interface EmailVerificationBannerProps {
  userId: string;
  email: string;
  name: string;
}

export function EmailVerificationBanner({
  userId,
  email,
  name,
}: EmailVerificationBannerProps) {
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (isDismissed || pathname === "/verify-email") return null;

  const handleResend = () => {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("email", email);
      formData.append("name", name);

      const res = await resendVerificationAction({}, formData);
      if (res.success) {
        setMessage({ type: "success", text: res.success });
      } else if (res.error) {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  return (
    <div className="relative z-50 w-full bg-zinc-950 border-b border-yellow-500/20 px-4 py-3 md:ml-64 md:w-[calc(100%-16rem)] mt-16 md:mt-0">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <p className="text-xs md:text-sm text-zinc-300 font-medium text-center sm:text-left">
            Your email <span className="text-[#ffedc3] font-semibold">{email}</span> is not verified. Please verify your account to unlock all features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {message ? (
            <span
              className={`text-xs font-semibold ${
                message.type === "success" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {message.text}
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isPending}
              className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {isPending ? "Sending..." : "Resend Email"}
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="text-zinc-400 hover:text-white transition p-1"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-sm block">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
