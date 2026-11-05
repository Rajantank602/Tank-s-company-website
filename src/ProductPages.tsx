import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Bubbles, DropLetters, SplitWords } from './effects';
import FigureMarks from './FigureMarks';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import tinyGantryImage from '../assets/tiny/web/compact-gantry.webp';
import machineDiagramImage from '../assets/tiny/web/machine-diagram.webp';
import { faqs } from './content';
import { homeHash } from './paths';
import { stagger, useReveal } from './useReveal';

// Keeps three.js out of the main bundle so the homepage doesn't download it.
const MachineScene = lazy(() => import('./MachineScene'));

const terrainImages = Object.entries(import.meta.glob<string>(
  '../assets/terrain/*.{png,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' },
))
  .map(([path, src]) => ({
    src,
    name: path.split(/[\\/]/).pop() ?? path,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const salientFeatures = [
  'Under chassis and wheel wash facility.',
  'Washes car up to 6.1 meters length.',
  'High water pressure, lower water usage.',
  'SS 304 grade stainless steel components in water prone areas.',
  'Appealing gantry design with no exposed service lines.',
  'Single arm delivers full available concentrated pressure.',
  'Reduced component counts. Reduced electricity consumption.',
  'More than a year of research and development results near-zero maintenance.',
  'Light weight compact gantry designed for crane-free erection.',
  'Advanced foaming technology.',
  '4-inch-high resolution touchscreen human machine interface.',
  'All hardware shall be SS 304 grade stainless steel.',
];

const equipment = [
  ['Structure', 'TATA steel'],
  ['High-pressure pump', 'Lubi'],
  ['Sensors', 'Pepperl+Fuchs'],
  ['Programmable controller', 'Siemens PLC'],
  ['Drive motor', 'Crompton'],
  ['Bearings', 'NTN Japan'],
  ['Gearbox', 'Rotomotive'],
  ['Variable frequency drive', 'Schneider'],
];

// The client's annotated machine drawing, rebuilt so its labels stay readable at any width. All
// numbers are in the drawing's own coordinates (see the viewBox below): `at` is the point on the
// machine, `leader` the line from there to the label, and the label pins to where that line ends.
const labelBeside = (right: number, y: number): CSSProperties => ({
  right: `${((1426 - right) / 1204) * 100}%`,
  top: `${((y - 110) / 680) * 100}%`,
  transform: 'translateY(-50%)',
});
const labelAbove = (left: number, bottom: number): CSSProperties => ({
  left: `${((left - 222) / 1204) * 100}%`,
  bottom: `${((790 - bottom) / 680) * 100}%`,
});

const machineCallouts = [
  { label: 'Foam shower\nmechanism', at: [650.5, 312], leader: 'M650.5 312H498.5', position: labelBeside(498.5, 312) },
  { label: 'Compact size gantry', at: [794.5, 287.5], leader: 'M794.5 287.5V389.5H781.5', position: labelBeside(781.5, 389.5) },
  { label: 'Rotating arm for\ntop external wash', at: [976.5, 391.5], leader: 'M976.5 391.5H1230.5V359.5', position: labelAbove(1129.5, 359.5) },
  { label: 'Vehicle washing zone', at: [777.5, 466.5], leader: 'M777.5 466.5H483.5', position: labelBeside(483.5, 466.5) },
  { label: 'Operating panel board\nwith touch screen', at: [860.5, 477.5], leader: 'M860.5 477.5V532.5H785.5', position: labelBeside(785.5, 532.5) },
  { label: 'RCC firm base', at: [446.5, 706.5], leader: 'M446.5 706.5H313.5V654.5', position: labelAbove(242.5, 654.5) },
  { label: 'Under chassis and\nwheel wash assembly', at: [1105.5, 702.5], leader: 'M1105.5 702.5H1244.5V650.5', position: labelAbove(1176.5, 650.5) },
];

type ProductImage = {
  src: string;
  name: string;
};

function ImageCarousel({
  images,
  label,
  className,
}: {
  images: ProductImage[];
  label: string;
  className: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const activeImage = images[activeIndex];
  const showPrevious = () => setActiveIndex((index) => (index - 1 + images.length) % images.length);
  const showNext = () => setActiveIndex((index) => (index + 1) % images.length);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsInView(entry.isIntersecting);
    });
    observer.observe(carousel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || !isInView || images.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [images.length, isInView, isPlaying]);

  return (
    <div
      ref={carouselRef}
      className={`image-carousel ${className}`}
      role="region"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') showPrevious();
        if (event.key === 'ArrowRight') showNext();
      }}
    >
      <figure
        className="image-carousel-slide"
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
        <img
          src={activeImage.src}
          alt={`${label} ${activeIndex + 1}`}
          loading={activeIndex === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      </figure>
      <div className="image-carousel-controls">
        <button type="button" className="image-carousel-arrow" aria-label="Previous image" onClick={showPrevious}>
          <span aria-hidden="true">←</span>
        </button>
        <span className="image-carousel-count" aria-live="off">
          {String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <button type="button" className="image-carousel-arrow" aria-label="Next image" onClick={showNext}>
          <span aria-hidden="true">→</span>
        </button>
        
        
      </div>
    </div>
  );
}

// Wide screens show the labels on leader lines around the machine. Small screens swap them for
// numbered points on the machine and a numbered list below it.
function MachineDiagram() {
  return (
    <figure className="machine-map">
      <div className="machine-map__drawing">
        <img
          src={machineDiagramImage}
          alt="Front view of the Tank's tiny gantry installed in its wash bay, with its main parts labelled"
          width={1087}
          height={699}
          loading="lazy"
          decoding="async"
        />
        {machineCallouts.map(({ label, at, leader, position }, index) => (
          <div
            className="machine-callout"
            style={{ '--x': at[0], '--y': at[1], '--i': index } as CSSProperties}
            key={label}
          >
            <svg viewBox="222 110 1204 680" aria-hidden="true"><path d={leader} pathLength={1} /></svg>
            <span className="machine-callout__point" aria-hidden="true">{index + 1}</span>
            <span className="machine-callout__label" style={position}>{label}</span>
          </div>
        ))}
        <FigureMarks label="Fig. 02" />
      </div>
      <ol className="machine-map__legend">
        {machineCallouts.map(({ label }, index) => (
          <li className="reveal-item" style={stagger(index)} key={label}>{label.replace('\n', ' ')}</li>
        ))}
      </ol>
    </figure>
  );
}

function ProductContact() {
  return (
    <section className="section contact-section product-contact" id="contact" data-reveal>
      <div className="contact-shell">
        <div className="contact-copy reveal-item">
          <p className="kicker">Let's talk.</p>
          <h2 className="t-h2"><SplitWords text="Bring Tank's tiny to your site." /></h2>
          <p className="product-section-copy">Tell us about your location and we’ll help you explore the right setup.</p>
        </div>
        <div className="product-contact-card reveal-item" style={stagger(1)}>
          <p>Want to see how Tank's tiny could work at your location?</p>
          <a className="button button--primary radius-full" href={homeHash('contact')}>Contact us</a>
        </div>
      </div>
    </section>
  );
}

function ProductFaq() {
  return (
    <section className="section faq-section" id="faq" aria-labelledby="tiny-faq-title" data-reveal>
      <div className="faq-shell">
        <div className="faq-intro reveal-item">
          <p className="kicker">Good to know.</p>
          <h2 className="t-h2" id="tiny-faq-title"><SplitWords text="Tank's tiny, at a glance." /></h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details className="faq-item reveal-item" style={stagger(index + 1)} key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TinyProductPage() {
  const assemblyProgress = useRef(1);
  const storyProgress = useRef(0.5);
  useReveal();

  return (
    <main className="page-shell product-page" id="top">
      <SiteNav page="tiny" />
      <section className="product-page-hero">
        <div className="product-page-hero-copy">
          <p className="kicker">Meet the machine</p>
          <h1 className="product-page-title">
            <span className="product-page-title__line">Small footprint.</span>{' '}
            <span className="product-page-title__line">A&nbsp;complete wash.</span>
          </h1>
          <p className="product-page-lede">
            Contactless, automatic 360° washing with high-pressure water and foam—cleaning any car size in around three minutes.
          </p>
        </div>
        <div className="product-page-model" aria-label="Interactive 3D render of Tank's tiny">
          <Suspense
            fallback={(
              <p className="model-loading">
                <span className="model-loading__drops" aria-hidden="true"><i /><i /><i /></span>
                Loading 3D model…
              </p>
            )}
          >
            <MachineScene
              assemblyProgress={assemblyProgress}
              storyProgress={storyProgress}
              isVisible
              interactive
            />
          </Suspense>

        </div>
      </section>

      <section className="product-introduction product-content-section" data-reveal>
        <div className="product-section-heading reveal-item">
          <p className="kicker">Introduction</p>
          <h2><SplitWords text="Who is Tank's tiny?" /></h2>
        </div>
        <div className="product-introduction-copy reveal-item" style={stagger(1)}>
          <p>
            Tank's tiny is a contactless automatic single-arm washing machine. Its arm delivers a 360° high-pressure water and foam shower to clean vehicles rapidly and consistently.
          </p>
          <p>
            Compared with manual washing, automation helps deliver a more efficient and repeatable wash—without compromising the compact footprint.
          </p>
        </div>
      </section>

      <section className="product-name-section" data-reveal>
        <Bubbles className="product-name-bubbles" />
        <div className="product-name-image">
          <img
            src={tinyGantryImage}
            alt="Compact Tank's tiny gantry render"
            width={1165}
            height={1072}
            loading="lazy"
          />
          <FigureMarks label="Fig. 01 · Advanced compact-size gantry" />
        </div>
        <div className="product-name-copy reveal-item" style={stagger(1)}>
          <p className="kicker">Why the name tiny?</p>
          <h2><SplitWords text={'The world\'s smallest single‑arm gantry.'} /></h2>
          <p>
            A reduced component count gives Tank's tiny its compact form and lowers the floor space needed for installation.
          </p>
        </div>
      </section>

      <section className="product-content-section" data-reveal>
        <div className="product-section-heading reveal-item">
          <p className="kicker">Machine overview</p>
          <h2><SplitWords text="Inside Tank's tiny." /></h2>
        </div>
        <MachineDiagram />
      </section>

      <section className="product-content-section" data-reveal>
        <div className="product-section-heading reveal-item">
          <p className="kicker">Salient features</p>
          <h2><SplitWords text={'Intense pressure.\nStubborn dirt doesn’t stand a chance.'} /></h2>
        </div>
        <ul className="product-feature-grid">
          {salientFeatures.map((feature, index) => (
            <li className="product-feature reveal-item" style={stagger(index + 1)} key={feature}>
              <span className="product-feature-number">{String(index + 1).padStart(2, '0')}</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="product-equipment-section" data-reveal>
        <div className="product-section-heading reveal-item">
          <p className="kicker">Components and controls</p>
          <h2><SplitWords text="Trusted names. Practical controls." /></h2>
        </div>
        <div className="equipment-grid">
          {equipment.map(([system, make], index) => (
            <div className="equipment-item reveal-item" style={stagger(index + 1)} key={system}>
              <span>{system}</span>
              <strong>{make}</strong>
            </div>
          ))}
        </div>
      </section>

      <ProductFaq />
      <ProductContact />
      <SiteFooter />
    </main>
  );
}

export function TerrainProductPage() {
  useReveal();

  return (
    <main className="page-shell terrain-page" id="top">
      <SiteNav page="terrain" />
      <section className="terrain-intro" aria-labelledby="terrain-heading">
        <div className="terrain-intro-copy">
          <p className="kicker">Tank's terrain</p>
          <h1 id="terrain-heading"><DropLetters text="Terrain" /></h1>
          <p className="terrain-intro-lede">
            Tank's Terrain is taking shape. Explore an early engineering preview and get in touch with our team to learn more.
          </p>
          <a className="button button--primary radius-full" href={homeHash('contact')}>
            Enquire about Terrain <span aria-hidden="true">→</span>
          </a>
        </div>
        <aside className="terrain-intro-aside" aria-label="Terrain product status">
          <span className="terrain-status-label">Product status</span>
          <span className="terrain-coming-soon">
            <span className="terrain-status-dot" aria-hidden="true" />
            Coming soon
          </span>
          <a className="terrain-preview-link" href="#terrain-preview">
            View the engineering preview <span aria-hidden="true">↓</span>
          </a>
        </aside>
      </section>
      <section
        className="terrain-preview-section"
        id="terrain-preview"
        aria-labelledby="terrain-preview-heading"
        data-reveal
      >
        <div className="terrain-preview-heading reveal-item">
          <div>
            <p className="kicker">Engineering preview</p>
            <h2 id="terrain-preview-heading"><SplitWords text="A first look at Terrain." /></h2>
          </div>
          <p className="terrain-preview-copy">
            Browse early renderings of Tank's Terrain as the design takes shape.
          </p>
        </div>
        <div className="terrain-image-frame reveal-item" style={stagger(1)}>
          <ImageCarousel
            images={terrainImages}
            label="Tank's Terrain engineering preview"
            className="terrain-image-carousel"
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
