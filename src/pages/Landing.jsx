import { useEffect, useRef, useState } from 'react';
import { Menu, X, ScanLine } from 'lucide-react';
import HeroScene from '../components/landing/HeroScene';
import './Landing.css';

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' },
];

const FEATURES = [
  {
    title: 'Live market intelligence',
    body: 'Finscan Agent reads markets, documents, and risk signals in real time so you can act before the window closes.',
  },
  {
    title: 'Crypto & ledger graphing',
    body: 'Map wallet networks, counterparties, and settlement paths as a glowing, searchable financial graph.',
  },
  {
    title: 'Compliance without friction',
    body: 'Automated document OCR, anomaly detection, and audit-ready trails — built for teams that cannot miss a flag.',
  },
];

const PLANS = [
  { name: 'Starter', price: '$0', note: 'Explore the agent on sample ledgers.' },
  { name: 'Pro', price: '$49', note: 'Live scans, alerts, and portfolio graphs.', featured: true },
  { name: 'Institution', price: 'Custom', note: 'Dedicated models, SSO, and on-prem options.' },
];

export default function Landing({ onAccess, onSignUp }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        /* autoplay may be blocked until user interaction */
      });
    }
  }, []);

  const goTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <header className={`landing-header ${scrolled ? 'is-scrolled' : ''}`}>
        <button type="button" className="brand" onClick={() => goTo('home')}>
          <span className="brand-mark">
            <ScanLine size={18} />
          </span>
          <span className="brand-name">Finscan Agent</span>
        </button>

        <nav className="landing-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" className="nav-link" onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" className="signup-btn" onClick={onSignUp}>
            Sign Up
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-nav">
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
          <button type="button" className="signup-btn" onClick={onSignUp}>
            Sign Up
          </button>
        </div>
      )}

      <section id="home" className="hero">
        <div className="hero-media">
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            poster="/landing-poster.jpg"
          >
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="hero-scene">
            <HeroScene />
          </div>
        </div>
        <div className="hero-veil" />
        <div className="hero-copy">
          <p className="eyebrow">Finscan Agent · Intelligence Layer</p>
          <h1>AI-Powered Financial Intelligence</h1>
          <p className="subtitle">
            See every ledger, wallet, and risk signal in one cinematic command center. Finscan Agent
            turns raw markets and documents into decisions you can trust.
          </p>
          <button type="button" className="access-btn" onClick={onAccess}>
            Access
          </button>
        </div>
      </section>

      <section id="features" className="panel">
        <h2>Features</h2>
        <div className="card-grid">
          {FEATURES.map((item) => (
            <article key={item.title} className="glass-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="panel">
        <h2>Pricing</h2>
        <div className="card-grid">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`glass-card ${plan.featured ? 'featured' : ''}`}>
              <h3>{plan.name}</h3>
              <p className="price">{plan.price}</p>
              <p>{plan.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="panel about">
        <h2>About</h2>
        <p>
          Finscan Agent is a financial intelligence platform built for operators who need clarity
          under pressure. We fuse document analysis, compliance monitoring, and market graphing into
          a single dark-ops workspace — neon-sharp, audit-ready, and always on.
        </p>
      </section>
    </div>
  );
}
