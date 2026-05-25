import React from 'react';
import { X, Heart } from 'lucide-react';
import './ActionButtons.css';

export default function ActionButtons({ onPass, onLike, dragProgress = 0, disabled }) {
  // dragProgress : -1 (full left) à +1 (full right)
  const likeScale = 1 + Math.min(0.08, Math.max(0, dragProgress) * 0.25);
  const passScale = 1 + Math.min(0.08, Math.max(0, -dragProgress) * 0.25);
  const likeOpacity = 1 - Math.min(0.5, Math.max(0, -dragProgress) * 0.7);
  const passOpacity = 1 - Math.min(0.5, Math.max(0, dragProgress) * 0.7);

  return (
    <div className="actions">
      <button
        type="button"
        className="btn-pass"
        onClick={onPass}
        disabled={disabled}
        aria-label="Passer"
        style={{
          transform: `scale(${passScale})`,
          opacity: passOpacity,
        }}
      >
        <X size={26} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className="btn-like"
        onClick={onLike}
        disabled={disabled}
        aria-label="Intéressé"
        style={{
          transform: `scale(${likeScale})`,
          opacity: likeOpacity,
        }}
      >
        <Heart size={28} fill="currentColor" strokeWidth={2} />
      </button>
    </div>
  );
}
