import { useEffect, useRef, useState } from "react";

// Keeps a node mounted through its exit animation: isVisible drives the
// enter/leave classes, isMounted lags behind by durationMs on close.
export function useMountTransition(isOpen: boolean, durationMs: number) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount during render so the node exists before its enter transition runs.
  if (isOpen && !isMounted) {
    setIsMounted(true);
  }

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current !== null) {
        clearTimeout(unmountTimer.current);
        unmountTimer.current = null;
      }
      // Flip to visible only after the enter styles have committed.
      let enterFrame = 0;
      const commitFrame = requestAnimationFrame(() => {
        enterFrame = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(commitFrame);
        cancelAnimationFrame(enterFrame);
      };
    }

    // Closing: play the exit transition, then unmount once it finishes.
    const exitFrame = requestAnimationFrame(() => setIsVisible(false));
    unmountTimer.current = setTimeout(() => setIsMounted(false), durationMs);
    return () => {
      cancelAnimationFrame(exitFrame);
    };
  }, [isOpen, durationMs]);

  return { isMounted, isVisible };
}
