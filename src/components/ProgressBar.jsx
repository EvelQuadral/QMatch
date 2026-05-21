import React from 'react';

export default function ProgressBar({ total, currentIndex }) {
  return (
    <div className="progress-container">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`progress-line ${i <= currentIndex ? 'active' : ''}`} />
      ))}
    </div>
  );
}
