"use client";

import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import { loginAction, registerAction, type AuthFormState } from "@/app/login/actions";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";

const initialState: AuthFormState = {};

type AuthPanelProps = {
  googleEnabled: boolean;
};

export function AuthPanel({ googleEnabled }: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginState, loginFormAction] = useActionState(loginAction, initialState);
  const [registerState, registerFormAction] = useActionState(registerAction, initialState);

  return (
    <section className="w-full max-w-5xl rounded-2xl md:rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-10">
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-yellow-300">
            movix account
          </span>
          <div className="space-y-4">
            <h1 className="font-headline-lg text-2xl text-[#ffedc3] md:text-4xl lg:text-6xl leading-tight">
              Sign in with Google or your own password.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-zinc-400 md:text-base md:leading-7">
              OAuth gets you in fast. Email and password gives you a portable local account backed by PostgreSQL and Prisma.
            </p>
          </div>

          {googleEnabled ? (
            <button
              type="button"
              onClick={() => signIn("google", { redirectTo: "/profile" })}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-5 py-4 font-semibold text-zinc-950 transition hover:scale-[1.01] hover:bg-zinc-100"
            >
              <span className="text-lg font-black">G</span>
              Continue with Google
            </button>
          ) : (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
              Google sign-in is disabled until valid `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` values are set.
            </div>
          )}

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <div className="h-px flex-1 bg-white/10" />
            or use credentials
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        <div className="rounded-xl md:rounded-[1.75rem] border border-white/10 bg-black/30 p-4 md:p-7">
          <div className="mb-6 flex rounded-full border border-white/10 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                activeTab === "login" ? "bg-yellow-400 text-zinc-950" : "text-zinc-400"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                activeTab === "register" ? "bg-yellow-400 text-zinc-950" : "text-zinc-400"
              }`}
            >
              Create Account
            </button>
          </div>

          {activeTab === "login" ? (
            <form action={loginFormAction} className="space-y-4">
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
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                  required
                />
              </label>
              {loginState.error ? <p className="text-sm text-rose-300">{loginState.error}</p> : null}
              <AuthSubmitButton label="Log In" />
            </form>
          ) : (
            <form action={registerFormAction} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Display name</span>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Movie lover"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                  required
                />
              </label>
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
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Password</span>
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
                <span className="text-sm font-medium text-zinc-300">Confirm password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the password"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/50"
                  required
                />
              </label>
              {registerState.error ? <p className="text-sm text-rose-300">{registerState.error}</p> : null}
              <AuthSubmitButton label="Create Account" />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
