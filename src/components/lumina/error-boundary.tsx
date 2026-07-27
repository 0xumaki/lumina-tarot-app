"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw } from "lucide-react";

/**
 * Lumina Error Boundary — catches client-side errors and shows
 * a branded fallback instead of the raw Next.js error page.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Lumina Error Boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: undefined })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  return (
    <div className="lum-aurora min-h-[100dvh] flex items-center justify-center bg-black px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-sm w-full text-center"
      >
        {/* Glowing orb */}
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
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium bg-[#E8EBE9] text-[#050806] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Lumina
          </button>
          <button
            onClick={onReset}
            className="text-[12px] text-ink-muted hover:text-ink transition-colors py-2"
          >
            Try again without reloading
          </button>
        </div>
      </motion.div>
    </div>
  );
}
