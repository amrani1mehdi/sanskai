"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  /** Initial offset in px, mirroring framer-motion's `initial={{ x, y }}`. */
  x?: number;
  y?: number;
  /** Stagger in milliseconds, for grids of cards. */
  delay?: number;
  /**
   * `mount` plays straight away (framer-motion's `animate`), `in-view` waits
   * for the element to scroll into view (`whileInView` + `viewport.once`).
   */
  trigger?: "mount" | "in-view";
};

/**
 * The live site animates these blocks with framer-motion. This reproduces the
 * same enter transition — fade plus a small slide — without pulling the whole
 * library in, and settles on the identical resting position.
 */
export function MotionReveal({
  children,
  className,
  x = 0,
  y = 0,
  delay = 0,
  trigger = "in-view",
}: MotionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Flip on the next frame rather than on the effect's synchronous path, so
    // the browser paints the offset start position first and the transition
    // actually plays.
    if (trigger === "mount") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [trigger]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate(${x}px, ${y}px)`,
        transition:
          "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
