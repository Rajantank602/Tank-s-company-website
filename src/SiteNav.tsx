import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoUrl from '../assets/logo.svg';
import terrainThumb from '../assets/nav/terrain.webp';
import tinyThumb from '../assets/nav/tiny.webp';
import { homeHash, pagePath } from './paths';

type SiteNavProps = {
  page: 'home' | 'tiny' | 'terrain';
};

export default function SiteNav({ page }: SiteNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contactHref = page === 'home' ? '#contact' : homeHash('contact');
  const faqHref = page === 'home' ? '#faq' : homeHash('faq');
  const aboutHref = page === 'home' ? '#about' : homeHash('about');

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    // The sheet only exists on small screens, so close it if the window grows past them.
    const desktopQuery = window.matchMedia('(min-width: 769px)');
    const handleDesktop = () => {
      if (desktopQuery.matches) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    desktopQuery.addEventListener('change', handleDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      desktopQuery.removeEventListener('change', handleDesktop);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {isOpen && (
        <button
          className="nav-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}
      <header className={`nav-pill ${isOpen ? 'is-open' : ''}`}>
        <a className="brand-link" href={pagePath()} aria-label="Tank's home" onClick={closeMenu}>
          <img className="brand-logo" src={logoUrl} alt="Tank's company" width={2716} height={699} />
        </a>
        <button
          className="nav-menu-toggle"
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <div className="nav-content" id="primary-navigation">
          <nav className="nav-links" aria-label="Main navigation">
            <a
              className="nav-link-row"
              href={pagePath()}
              aria-current={page === 'home' ? 'page' : undefined}
              onClick={closeMenu}
            >
              Home
              <ArrowRight className="nav-link-arrow" aria-hidden="true" />
            </a>
            <span className="nav-section-label">Machines</span>
            <a
              className="nav-link-product"
              href={pagePath('tiny')}
              aria-current={page === 'tiny' ? 'page' : undefined}
              onClick={closeMenu}
            >
              <img className="nav-link-thumb" src={tinyThumb} alt="" width={480} height={300} loading="lazy" decoding="async" />
              <span className="nav-link-label">tiny</span>
              <span className="nav-link-title-mobile">Tank's tiny</span>
            </a>
            <a
              className="nav-link-product"
              href={pagePath('terrain')}
              aria-current={page === 'terrain' ? 'page' : undefined}
              onClick={closeMenu}
            >
              <img className="nav-link-thumb" src={terrainThumb} alt="" width={480} height={300} loading="lazy" decoding="async" />
              <span className="nav-link-label">terrain</span>
              <span className="nav-link-title-mobile">Tank's Terrain</span>
            </a>
            <a className="nav-link-row" href={aboutHref} onClick={closeMenu}>
              About us
              <ArrowRight className="nav-link-arrow" aria-hidden="true" />
            </a>
            <a className="nav-link-row" href={faqHref} onClick={closeMenu}>
              FAQ
              <ArrowRight className="nav-link-arrow" aria-hidden="true" />
            </a>
          </nav>
          <a
            className="button button--primary radius-full nav-cta"
            href={contactHref}
            onClick={closeMenu}
          >
            Contact us <span aria-hidden="true">→</span>
          </a>
          <a className="nav-menu-email" href="mailto:connect@tankscompany.com">
            connect@tankscompany.com
          </a>
        </div>
      </header>
    </>
  );
}
