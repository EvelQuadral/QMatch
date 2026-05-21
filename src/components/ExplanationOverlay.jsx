import React from 'react';

export default function ExplanationOverlay({ onClose }) {
  return (
    <div className="explanation-overlay" onClick={onClose}>
      <img src="/explication.png" alt="Explication" className="explanation-image" />
    </div>
  );
}
