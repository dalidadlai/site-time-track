import { useLayoutEffect, useRef, useState } from 'react';

// Capture before changing the rendered screen: unmount cleanup is too late,
// because a shorter destination can already have clamped window.scrollY.
export function useViewNavigation<T>(initialView: T, keyFor: (view: T) => string) {
  const [view, setView] = useState(initialView);
  const positions = useRef(new Map<string, number>());
  const key = keyFor(view);

  const navigate = (next: T) => {
    positions.current.set(key, window.scrollY);
    setView(next);
  };

  useLayoutEffect(() => {
    window.scrollTo({ top: positions.current.get(key) ?? 0, left: 0, behavior: 'instant' });
  }, [key]);

  return [view, navigate] as const;
}