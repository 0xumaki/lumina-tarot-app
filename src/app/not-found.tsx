"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="lum-aurora min-h-[100dvh] flex items-center justify-center bg-black px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-sm w-full text-center"
      >
        <motion.div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.2), transparent 70%)",
            border: "1px solid rgba(197,168,124,0.3)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[32px]">🌙</span>
        </motion.div>

        <div className="text-[11px] uppercase tracking-[0.22em] text-gold/80 font-medium mb-2">
          404
        </div>
        <h1 className="text-[22px] font-light tracking-[-0.02em] text-ink">
          The path <span className="lum-text-gold">fades</span> into mist
        </h1>
        <p className="text-[13px] text-ink-muted mt-2 leading-[19px] max-w-[280px] mx-auto">
          This page has scattered like starlight. Let's find your way back.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium bg-[#E8EBE9] text-[#050806] active:scale-[0.98] transition-all"
        >
          <Home className="w-4 h-4" />
          Return to Lumina
        </Link>
      </motion.div>
    </div>
  );
}
