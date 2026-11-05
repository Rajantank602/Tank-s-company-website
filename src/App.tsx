import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import featureLengthDetection from '../assets/homepage/web/feature-6.webp';
import featureStabilization from '../assets/homepage/web/feature-7.webp';
import featureReinforced from '../assets/homepage/web/feature-8.webp';
import featureFootprint from '../assets/homepage/web/feature-9.webp';
import featureSimplified from '../assets/homepage/web/feature-10.webp';
import patentTopView from '../assets/homepage/web/patent-top-view.webp';
import tinyIntroImage from '../assets/homepage/web/tiny-intro.webp';
import { Bubbles, RollingNumber, SplitWords, TypeIn } from './effects';
import FigureMarks from './FigureMarks';
import HeroStage from './HeroStage';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import { TerrainProductPage, TinyProductPage } from './ProductPages';
import { companyAddressLines, faqs } from './content';
import { currentPage } from './paths';
import { updateSeoMetadata } from './seo';
import { stagger, useReveal } from './useReveal';

// The hero's company line, in two parts: phones stack them, wider screens run them together.
const heroCompany = 'Tank’s company';
const heroRole = 'Machine manufacturer';

const homeFeatures = [
  {
    title: 'Automatic car length detection system.',
    image: featureLengthDetection,
    width: 915,
    height: 939,
    alt: "Line drawing of a car parked beneath the Tank's tiny gantry",
  },
  {
    title: 'A compact gantry with advanced stabilization system on track for vibrationless movement.',
    image: featureStabilization,
    width: 820,
    height: 631,
    alt: "Render of the Tank's gantry carriage with its track stabilization wheels",
  },
  {
    title: 'Heavily reinforced structure designed to withstand high-pressure dynamic loads.',
    image: featureReinforced,
    width: 1112,
    height: 360,
    alt: "Render of the reinforced Tank's tiny gantry frame and name board",
    // A close-up cropped through the frame, so its cut edges fade out instead of stopping hard.
    croppedRender: true,
  },
  {
    title: 'Minimal floor coverage, longer washing reach.',
    image: featureFootprint,
    width: 1096,
    height: 1095,
    alt: "Render of the compact Tank's tiny gantry and its extended washing arm",
  },
  {
    title: 'No air compressor required. No detergent pump required. Fewer components. Simplified architecture.',
    image: featureSimplified,
    width: 1537,
    height: 1049,
    alt: "Line drawing of a complete Tank's tiny wash bay with gantry, pump and control panel",
  },
];

// Ticks a figure up from zero when it scrolls into view. The final text is always in the DOM:
// once for screen readers, and once invisibly so the ticking digits never shift layout.
function CountUp({ value, prefix = '', suffix = '', delay }: { value: number; prefix?: string; suffix?: string; delay: number }) {
  const [shown, setShown] = useState(0);
  const counter = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = counter.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return undefined;
    }

    let frame = 0;
    let timeout = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      timeout = window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 1100, 1);
          setShown(Math.round(value * (1 - (1 - progress) ** 3)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, delay);
    }, { threshold: 0.6 });
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delay]);

  const text = `${prefix}${value}${suffix}`;
  return (
    <span className="count-up" ref={counter}>
      <span className="sr-only">{text}</span>
      <span className="count-up__space" aria-hidden="true">{text}</span>
      <span className="count-up__live" aria-hidden="true">{prefix}{shown}{suffix}</span>
    </span>
  );
}

function HomePage() {
  const [contactStatus, setContactStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  useReveal();

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setContactStatus('submitting');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const result: unknown = await response.json();
      if (
        !response.ok
        || typeof result !== 'object'
        || result === null
        || !('success' in result)
        || result.success !== true
      ) {
        throw new Error('Web3Forms rejected the contact enquiry');
      }

      form.reset();
      setContactStatus('success');
    } catch (error) {
      console.error('Unable to submit contact enquiry:', error);
      setContactStatus('error');
    }
  };

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;

    document.getElementById(targetId)?.scrollIntoView();
  }, []);

  return (
    <main className="page-shell" id="top">
      <SiteNav page="home" />

      <section className="home-hero" aria-labelledby="home-hero-heading">
        <Bubbles className="home-hero__bubbles" />
        <div className="home-hero__inner">
          {/* The wash pass: CSS draws a dusty copy from data-text that the spray bar sweeps clean. */}
          <h1 className="home-hero__title" id="home-hero-heading" data-text={`${heroCompany} · ${heroRole}`}>
            <span className="home-hero__title-clean">
              {heroCompany}
              <span className="home-hero__title-dot"> · </span>
              <span className="home-hero__title-role">{heroRole}</span>
            </span>
            <span className="home-hero__wash" aria-hidden="true" />
          </h1>
          <div className="home-hero__sign">
            <p className="home-hero__sign-plate">The major evolution in vehicle wash industry</p>
            <span className="home-hero__drips" aria-hidden="true"><i /><i /></span>
          </div>
          <HeroStage />
        </div>
      </section>

      <section className="home-intro" aria-labelledby="home-intro-heading" data-reveal>
        <div className="home-intro__copy reveal-item">
          <h2 className="home-intro__title" id="home-intro-heading"><SplitWords text={'Meet Tank’s\ntiny.'} /></h2>
          <p className="home-intro__subtitle"><TypeIn text="Automatic car wash machine" delay={500} /></p>
        </div>
        <figure className="home-intro__media">
          <img
            src={tinyIntroImage}
            alt="Front view of Tank's tiny installed in a wash bay, with its control panel and pump"
            width={1160}
            height={773}
            loading="lazy"
            decoding="async"
          />
        </figure>
        <div className="cta-row home-intro__actions reveal-item" style={stagger(1)}>
          <a className="hero-primary-link" href="#features">Explore the features <span aria-hidden="true">↓</span></a>
          <a className="hero-secondary-link" href="#contact">Talk to our team <span aria-hidden="true">↗</span></a>
        </div>
        <dl className="home-intro__specs reveal-item" style={stagger(2)}>
          <div>
            <dt>per wash</dt>
            <dd><CountUp prefix="~" value={3} suffix=" min" delay={200} /></dd>
          </div>
          <div>
            <dt>washing coverage</dt>
            <dd><CountUp value={360} suffix="°" delay={300} /></dd>
          </div>
          <div>
            <dt>pressure from each of thirteen nozzles</dt>
            <dd><CountUp value={22} suffix=" bar" delay={400} /></dd>
          </div>
        </dl>
      </section>

      <section className="section about-section" id="about" aria-labelledby="about-heading" data-reveal>
        <div className="about-copy">
          <div className="about-heading reveal-item">
            <p className="kicker">About Tank’s company</p>
            <h2 className="t-h2" id="about-heading"><SplitWords text="An idea to make everyday life a little easier." /></h2>
          </div>
          <div className="about-story">
            <p className="reveal-item" style={stagger(1)}>
              Tank’s company was founded on a single idea – a vision dedicated to people and driven by
              a strong desire to change the world by making everyday life easier for everyone. We
              manufacture machines for the machines that have become our <span className="wash-mark">second
              homes</span> – our vehicles.
            </p>
            <p className="reveal-item" style={stagger(2)}>
              As vehicle numbers grow, dust, airborne pollution, road particles, moisture and other
              contaminants settle on the vehicles we rely on everyday. Tank’s company gives those
              intruders a gentle, mechanical nudge away, helping our second homes stay clean and
              attractive.
            </p>
            <p className="reveal-item" style={stagger(3)}>
              We build automatic vehicle washing machines with advanced technology and a commitment to
              world-class standards.
            </p>
          </div>
        </div>
      </section>

      <section className="home-features" id="features" aria-label="Key features">
        {homeFeatures.map((feature, index) => (
          <article className="home-feature" key={feature.title} data-reveal>
            <div className="home-feature__copy reveal-item">
              <span className="home-feature__index">{String(index + 1).padStart(2, '0')}</span>
              <h3><SplitWords text={feature.title} /></h3>
            </div>
            <figure className={`home-feature__media${'croppedRender' in feature ? ' home-feature__media--cropped' : ''}`}>
              <img
                src={feature.image}
                alt={feature.alt}
                width={feature.width}
                height={feature.height}
                loading="lazy"
                decoding="async"
              />
              <FigureMarks label={`Fig. ${String(index + 1).padStart(2, '0')}`} />
            </figure>
          </article>
        ))}
      </section>

      <section className="home-patent" aria-labelledby="patent-heading" data-reveal>
        <figure className="home-patent__media">
          <img
            src={patentTopView}
            alt="Top view of the Tank's tiny gantry with its washing arm and cable carrier"
            width={1472}
            height={872}
            loading="lazy"
            decoding="async"
          />
          <FigureMarks label="Top view" />
        </figure>
        <div className="home-patent__copy reveal-item" style={stagger(1)}>
          <h2 className="kicker" id="patent-heading">Intellectual property</h2>
          <dl className="home-patent__list">
            <div>
              <dt>Patent filed</dt>
              <dd><RollingNumber value="202621084880" /></dd>
            </div>
            <div>
              <dt>Design registration</dt>
              <dd><RollingNumber value="508904-001" /></dd>
            </div>
          </dl>
          <span className="home-patent__stamp" aria-hidden="true">Registered<br />design</span>
        </div>
      </section>

      <section className="section faq-section" id="faq" aria-labelledby="faq-heading" data-reveal>
        <div className="faq-shell">
          <div className="faq-intro reveal-item">
            <p className="kicker">Good to know.</p>
            <h2 className="t-h2" id="faq-heading"><SplitWords text="Frequently asked questions." /></h2>
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

      <section className="section contact-section" id="contact" data-reveal>
        <div className="contact-shell">
          <div className="contact-copy reveal-item">
            <p className="kicker">Plan your wash bay</p>
            <h2 className="t-h2"><SplitWords text="Find the right wash solution for your *site*." /></h2>
            <p className="contact-intro">
              Tell us about your location and vehicle-washing needs. We'll help you explore the right
              Tank's automatic wash setup for your site.
            </p>
            <p className="contact-intro contact-email">
              Prefer email? <a href="mailto:connect@tankscompany.com">connect@tankscompany.com</a>
            </p>
            <div className="contact-address">
              <span>Visit us</span>
              <address>
                Tank’s company
                {companyAddressLines.map((line) => <span key={line}>{line}</span>)}
              </address>
            </div>
          </div>
          <form
            className="contact-card reveal-item"
            style={stagger(1)}
            onSubmit={handleContactSubmit}
            aria-busy={contactStatus === 'submitting'}
          >
            <input type="hidden" name="access_key" value="9feaac2f-4447-4df3-b749-48798847a915" />
            <div className="form-row"><label htmlFor="enquiry-name">Full name *</label><input id="enquiry-name" name="name" type="text" autoComplete="name" placeholder="Your name" required /></div>
            <div className="form-row"><label htmlFor="enquiry-email">Email address *</label><input id="enquiry-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
            <div className="form-row form-row--message"><label htmlFor="enquiry-message">Your message *</label><textarea id="enquiry-message" name="message" placeholder="Tell us about your site, requirements, and plans..." rows={4} required></textarea></div>
            <div className="action-row">
              <button
                type="submit"
                className="button button--primary contact-submit"
                disabled={contactStatus === 'submitting'}
              >
                {contactStatus === 'submitting' ? 'Sending...' : 'Send enquiry'}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            {contactStatus === 'success' && (
              <p className="contact-status contact-status--sent" role="status">
                <span className="contact-foam" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                Thanks for reaching out. We'll be in touch soon.
              </p>
            )}
            {contactStatus === 'error' && (
              <p className="contact-status" role="alert">We couldn't send your enquiry. Please try again.</p>
            )}
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

export default function App() {
  const page = currentPage();
  useEffect(() => {
    updateSeoMetadata(page);
  }, [page]);

  if (page === 'tiny') return <TinyProductPage />;
  if (page === 'terrain') return <TerrainProductPage />;
  return <HomePage />;
}
