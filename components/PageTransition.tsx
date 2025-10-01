'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirst = React.useRef(true);

  // After first client render, flip the flag
  React.useEffect(() => {
    isFirst.current = false;
  }, []);

  // On the very first load, render children without route animation
  if (isFirst.current) {
    return <div className="min-h-[60vh]">{children}</div>;
  }

  // On subsequent route changes, do a smooth fade
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-[60vh]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
