import React from 'react';

export default function IntroScreen({ onStart }) {
  return (
    <div className="app intro-mode">
      <div className="intro-screen">
        <div className="intro-content">
          <h1 className="intro-title">Bienvenue sur</h1>

          <div className="intro-logo-section">
            <div className="intro-logo-container">
              <img src="/logo.svg" alt="Quadral" className="intro-logo" />
            </div>
          </div>

          <div className="intro-subtitle">
            <p className="intro-tagline">la seule application qui fait matcher</p>
            <p className="intro-highlight">
              <span className="highlight-pink">VOS BESOINS</span> avec{' '}
              <span className="highlight-pink">NOS SERVICES</span> !
            </p>
          </div>

          <div className="intro-separator"></div>

          <div className="intro-description">
            <p className="intro-text">
              <em>Bailleurs institutionnels ou sociaux,</em>
            </p>
            <p className="intro-text">
              vous avez des besoins, nous avons des solutions ! Choisissez la spécialité et
              l'expertise qui match le mieux avec vos problématiques.
            </p>
          </div>

          <button className="intro-start-btn" onClick={onStart}>
            Commencer à MATCHER
          </button>
        </div>
      </div>
    </div>
  );
}
