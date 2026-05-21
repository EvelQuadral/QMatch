import React from 'react';

export default function Header({ onLogoClick, likeCount, onCounterClick }) {
  return (
    <div className="header">
      <div className="logo" onClick={onLogoClick}>
        <img src="/logo.png" alt="Quadral" className="logo-image" />
      </div>
      <div className="match-counter" onClick={onCounterClick}>
        <span className="heart">❤️</span>
        <span>{likeCount}</span>
      </div>
    </div>
  );
}
