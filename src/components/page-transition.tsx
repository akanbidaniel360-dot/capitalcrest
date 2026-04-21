import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps route content with a unique entrance animation per navigation.
 * Combines a depth-blur fade with a subtle vertical drift and
 * a brand-color glow sweep that wipes across the screen.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14, filter: "blur(8px)", scale: 0.985 }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
        exit={{ opacity: 0, y: -10, filter: "blur(6px)", scale: 0.99 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen"
      >
        {/* Brand glow sweep — runs once per route */}
        <motion.div
          aria-hidden
          initial={{ x: "-100%", opacity: 0.55 }}
          animate={{ x: "120%", opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none fixed inset-y-0 left-0 z-[60] w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent blur-2xl"
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}