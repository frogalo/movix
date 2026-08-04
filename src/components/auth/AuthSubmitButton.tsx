"use client";

import { useFormStatus } from "react-dom";

type AuthSubmitButtonProps = {
  label: string;
};

export function AuthSubmitButton({ label }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-yellow-400 px-4 py-3 font-semibold text-[#241a00] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Working..." : label}
    </button>
  );
}
