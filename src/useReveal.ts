import { useEffect } from 'react';
import type { CSSProperties } from 'react';

// Marks each [data-reveal] element with data-revealed the first time it scrolls into view, so
// CSS can play its one-off entrance (figure marks framing a drawing, the patent stamp landing,
// .reveal-item children rising in). Tall sections count as seen once a good slice is on screen.
export function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const viewport = entry.rootBounds?.height ?? window.innerHeight;
        const enough = Math.min(entry.boundingClientRect.height * 0.2, viewport * 0.3);
        if (!entry.isIntersecting || entry.intersectionRect.height < enough) return;
        (entry.target as HTMLElement).dataset.revealed = '';
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: [0, 0.05, 0.1, 0.15, 0.2] });

    document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
}

// Position of a .reveal-item in its group; CSS turns it into a staggered entrance delay.
export function stagger(index: number) {
  return { '--i': index } as CSSProperties;
}
