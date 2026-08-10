"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // NEXT_REDIRECT is an internal Next.js mechanism for redirect(), not a real error
    if (error?.message !== "NEXT_REDIRECT" && error?.digest !== "NEXT_REDIRECT") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="md:ml-64 w-full md:w-[calc(100%-16rem)] min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-md w-full text-center z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-8xl font-black tracking-widest text-red-500 select-none font-sans drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            500
          </h1>
          <h2 className="text-2xl font-bold text-zinc-100 font-sans tracking-wide">
            Something went wrong
          </h2>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl transition-all duration-300 border border-white/10 cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-[#241a00] font-bold rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(250,204,21,0.25)] hover:shadow-[0_4px_25px_rgba(250,204,21,0.4)] text-center"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
