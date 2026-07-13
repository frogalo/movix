"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthFormState } from "@/app/login/actions";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

const initialState: AuthFormState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

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
              movix account
            </span>
            <div className="space-y-2">
              <h1 className="font-headline-lg text-2xl text-[#ffedc3] md:text-3xl leading-tight">
                Forgot Password
              </h1>
              <p className="text-sm text-zinc-400">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {state.success ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {state.success}
                </div>
                <Link
                  href="/login"
                  className="block text-center text-sm font-semibold text-yellow-400 hover:text-yellow-300 hover:underline"
                >
                  Back to Log In
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                    required
                  />
                </label>
                {state.error ? (
                  <p className="text-sm text-rose-300">{state.error}</p>
                ) : null}
                <AuthSubmitButton label="Send Reset Link" />

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-zinc-400 hover:text-yellow-400 hover:underline"
                  >
                    Back to Log In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
