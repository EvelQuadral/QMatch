import React from 'react';
import { ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import './Intro.css';

// ────────────────────────────────────────────────────────────
// Contenu de la carte hero (animation intro). Modifiable ici.
// ────────────────────────────────────────────────────────────
const HERO_INITIALS = 'CH';
const HERO_FLIP_STAT_NUMBER = '3,3 M€';
const HERO_FLIP_STAT_LABEL = 'CA bloc 2024';
// ────────────────────────────────────────────────────────────

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
                <div className="hero-card-initials">{HERO_INITIALS}</div>
                <div className="hero-stamp">AJOUTER</div>
                <div className="hero-info-hint">i</div>
              </div>
              <div className="hero-face hero-face-back">
                <div className="hero-stat-mock">
                  <div className="hero-stat-n">{HERO_FLIP_STAT_NUMBER}</div>
                  <div className="hero-stat-l">{HERO_FLIP_STAT_LABEL}</div>
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
          6 expertises Quadral, plusieurs visages. À vous de composer votre carnet d'adresses.
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
