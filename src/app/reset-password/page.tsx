"use client";

import { useActionState, use } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthFormState } from "@/app/login/actions";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

const initialState: AuthFormState = {};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default function ResetPasswordPage({ searchParams }: Props) {
  const { token } = use(searchParams);
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (!token) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 md:ml-64 md:w-[calc(100%-16rem)]">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div className="absolute left-[10%] top-[15%] h-64 w-64 rounded-full bg-[#571bc1] blur-[120px]" />
          <div className="absolute bottom-[10%] right-[15%] h-72 w-72 rounded-full bg-[#ffcc00] blur-[140px]" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="text-2xl font-bold mb-3 text-rose-400">Invalid Link</h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              No reset token was provided. Check the link in your email or request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block rounded-full bg-yellow-400 px-8 py-3 text-sm font-bold text-[#241a00] transition hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 pb-28 pt-24 md:ml-64 md:w-[calc(100%-16rem)] md:px-12 md:pb-12 md:pt-12">
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <div className="absolute left-[-5%] top-[10%] h-72 w-72 rounded-full bg-[#571bc1] blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] h-80 w-80 rounded-full bg-[#ffcc00] blur-[140px]" />
        <div className="absolute right-[20%] top-[20%] h-64 w-64 rounded-full bg-[#00daf3] blur-[130px]" />
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <section className="w-full max-w-md rounded-2xl md:rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-yellow-300">
              movix security
            </span>
            <div className="space-y-2">
              <h1 className="font-headline-lg text-2xl text-[#ffedc3] md:text-3xl leading-tight">
                Reset Password
              </h1>
              <p className="text-sm text-zinc-400">
                Choose a new, secure password for your account.
              </p>
            </div>

            {state.success ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {state.success}
                </div>
                <Link
                  href="/login"
                  className="block text-center rounded-full bg-yellow-400 px-8 py-3 text-sm font-bold text-[#241a00] transition hover:bg-yellow-300"
                >
                  Log In
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="token" value={token} />

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-300">New Password</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Confirm New Password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat the new password"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                    required
                  />
                </label>

                {state.error ? (
                  <p className="text-sm text-rose-300">{state.error}</p>
                ) : null}

                <AuthSubmitButton label="Reset Password" />
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
