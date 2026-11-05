import logoUrl from '../assets/logo.svg';
import { companyAddressLines } from './content';
import { homeHash, pagePath } from './paths';
import { stagger } from './useReveal';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="footer-cta" aria-labelledby="footer-cta-heading">
        <h2 id="footer-cta-heading">
          Ready to make vehicle care{' '}
          <em>
            easier?
            {/* The sparkle of a freshly washed car. */}
            <span className="footer-cta-sparkles" aria-hidden="true"><i /><i /><i /></span>
          </em>
        </h2>
        <p>Let’s talk about a smarter wash solution for your site.</p>
        <a className="footer-cta-button" href={homeHash('contact')}>Start a conversation</a>
      </section>
      <div className="site-footer-inner">
        <div className="site-footer-main" data-reveal>
          <div className="site-footer-about reveal-item">
            <a className="site-footer-brand" href={pagePath()} aria-label="Tank's company home">
              <img src={logoUrl} alt="Tank's company" width={2716} height={699} />
            </a>
            <p>
              We build automatic vehicle-washing machines with thoughtful design, advanced
              technology and a commitment to world-class standards.
            </p>
            <address className="site-footer-address">
              <span className="site-footer-address-name">Tank’s company</span>
              {companyAddressLines.map((line) => <span key={line}>{line}</span>)}
            </address>
          </div>
          <nav className="site-footer-links reveal-item" style={stagger(1)} aria-label="Products">
            <h3>Products</h3>
            <a href={pagePath('tiny')}>Tiny</a>
            <a href={pagePath('terrain')}>Terrain</a>
          </nav>
          <nav className="site-footer-links reveal-item" style={stagger(2)} aria-label="Company">
            <h3>Company</h3>
            <a href={homeHash('about')}>About us</a>
            <a href={homeHash('faq')}>FAQ</a>
          </nav>
          <nav className="site-footer-links reveal-item" style={stagger(3)} aria-label="Connect">
            <h3>Connect</h3>
            <a href={homeHash('contact')}>Contact us</a>
            <a href="mailto:connect@tankscompany.com">connect@tankscompany.com</a>
          </nav>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Tank’s company. All rights reserved.</span>
          {/* A tiny gantry that never stops washing its stretch of track. */}
          <span className="footer-rail" aria-hidden="true">
            <span className="footer-rail__gantry">
              <svg viewBox="0 0 26 20" width="26" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 19V6l3-4h14l3 4v13" />
                <path d="M1.5 19h3M21.5 19h3M13 2v8M10 10h6" />
              </svg>
              <span className="footer-rail__spray"><i /><i /><i /></span>
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
