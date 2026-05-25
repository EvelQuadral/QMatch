import React from 'react';
import { ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import './Intro.css';

export default function Intro({ onStart }) {
  const handleStart = () => {
    if (typeof window !== 'undefined' && window.lintrk) {
      window.lintrk('track', { conversion_id: 23694730 });
    }
    onStart?.();
  };

  return (
    <div className="intro">
      <div className="intro-header">
        <Logo />
        <div className="intro-stamp">STAND · CONGRÈS HLM 2026</div>
      </div>

      <div className="intro-hero">
        <div className="hero-stack">
          <div className="hero-card hero-card-3" aria-hidden="true">
            <div className="hero-card-shimmer" />
          </div>
          <div className="hero-card hero-card-2" aria-hidden="true">
            <div className="hero-card-initials">SL</div>
          </div>
          <div className="hero-card hero-card-1" aria-hidden="true">
            <div className="hero-card-inner">
              <div className="hero-face hero-face-front">
                <div className="hero-card-initials">CH</div>
                <div className="hero-stamp">AJOUTER</div>
                <div className="hero-info-hint">i</div>
              </div>
              <div className="hero-face hero-face-back">
                <div className="hero-stat-mock">
                  <div className="hero-stat-n">3,3 M€</div>
                  <div className="hero-stat-l">CA bloc 2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="intro-text">
        <h1 className="intro-title">
          Les bonnes rencontres
          <br />
          ne s'inventent pas.
        </h1>
        <p className="intro-desc">
          16 directeurs Quadral. Swipez ceux qui matchent vos besoins, repartez avec leurs contacts.
        </p>
      </div>

      <div className="intro-cta-wrap">
        <button type="button" className="intro-cta" onClick={handleStart}>
          <span>Découvrir l'expérience</span>
          <ArrowRight size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
