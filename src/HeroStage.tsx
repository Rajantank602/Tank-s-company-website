import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
// Interim cut-outs made from the client's white-background renders. Replace these files with
// the client's background-removed renders when they arrive: transparent, cropped so the base of
// the machine (or its platform) touches the bottom edge, which is where it meets the floor.
import cutoutOne from '../assets/homepage/web/cutout-1.webp';
import cutoutTwo from '../assets/homepage/web/cutout-2.webp';
import cutoutThree from '../assets/homepage/web/cutout-3.webp';
import cutoutFour from '../assets/homepage/web/cutout-4.webp';
import cutoutFive from '../assets/homepage/web/cutout-5.webp';

type StageSlide = {
  src: string;
  alt: string;
  // Width / height of the image file: sizes the slide to the machine so its floor shadow fits it.
  aspect: number;
};

const slides: StageSlide[] = [
  {
    src: cutoutOne,
    alt: "Tank's tiny gantry car wash installed in a wash bay with its control panel and pump",
    aspect: 1667 / 671,
  },
  {
    src: cutoutTwo,
    alt: "Overhead view of a complete Tank's tiny wash bay layout",
    aspect: 1490 / 1120,
  },
  {
    src: cutoutThree,
    alt: "Tank's tiny gantry beside a wall-mounted control panel and high-pressure pump",
    aspect: 1617 / 651,
  },
  {
    src: cutoutFour,
    alt: "Side view of the Tank's Terrain gantry with a car inside the wash bay",
    aspect: 1003 / 477,
  },
  {
    src: cutoutFive,
    alt: "Front view of the Tank's Terrain gantry with a car ready for washing",
    aspect: 830 / 772,
  },
];

const SLIDE_DURATION_MS = 6000;

type Direction = 'next' | 'previous';

export default function HeroStage() {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>('next');
  const [isInView, setIsInView] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<number | null>(null);

  const goTo = (index: number, nextDirection: Direction) => {
    if (index === current) return;
    setPrevious(current);
    setCurrent(index);
    setDirection(nextDirection);
  };
  const showNext = () => goTo((current + 1) % slides.length, 'next');
  const showPrevious = () => goTo((current - 1 + slides.length) % slides.length, 'previous');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsInView(entry.isIntersecting);
    });
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  // Auto-scroll; restarting on every change means a swipe also resets the timer.
  useEffect(() => {
    if (!isInView) return undefined;

    const timeout = window.setTimeout(showNext, SLIDE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [current, isInView]);

  return (
    <div
      ref={stageRef}
      className="hero-stage"
      role="region"
      aria-roledescription="carousel"
      aria-label="Tank's machines"
      onPointerDown={(event) => { pointerStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const delta = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) > 45) {
          if (delta > 0) showPrevious();
          else showNext();
        }
      }}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      {slides.map((slide, index) => {
        let state = 'is-hidden';
        if (index === current) state = previous === null ? 'is-current' : `is-current is-entering-${direction}`;
        else if (index === previous) state = `is-leaving is-leaving-${direction}`;

        return (
          <figure
            className={`hero-stage__slide ${state}`}
            style={{ '--aspect': slide.aspect } as CSSProperties}
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== current}
          >
            <img
              className="hero-stage__machine"
              src={slide.src}
              alt={slide.alt}
              draggable={false}
              decoding={index === 0 ? 'sync' : 'async'}
            />
            <img className="hero-stage__reflection" src={slide.src} alt="" draggable={false} decoding="async" />
          </figure>
        );
      })}
    </div>
  );
}
