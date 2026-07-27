"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Lumina Error]", error);
  }, [error]);

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
            background: "radial-gradient(circle at 50% 40%, rgba(197,168,124,0.25), transparent 70%)",
            border: "1px solid rgba(197,168,124,0.35)",
            boxShadow: "0 0 40px rgba(197,168,124,0.2)",
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-8 h-8 text-gold" />
        </motion.div>

        <h1 className="text-[22px] font-light tracking-[-0.02em] text-ink">
          The cards are <span className="lum-text-gold">reshuffling</span>
        </h1>
        <p className="text-[13px] text-ink-muted mt-2 leading-[19px] max-w-[280px] mx-auto">
          A momentary disruption in the veil. Take a breath, and we'll try again.
        </p>

        {error?.message && (
          <p className="text-[10px] text-ink-muted/50 mt-3 font-mono break-all">
            {error.message.slice(0, 120)}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium bg-[#E8EBE9] text-[#050806] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-[12px] text-ink-muted hover:text-ink transition-colors py-2"
          >
            Reload Lumina
          </button>
        </div>
      </motion.div>
    </div>
  );
}
