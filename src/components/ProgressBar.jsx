import React from 'react';
import './ProgressBar.css';

export default function ProgressBar({ total, currentIndex }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        let state = 'pending';
        if (i < currentIndex) state = 'done';
        else if (i === currentIndex) state = 'current';
        return <span key={i} className={`progress-seg seg-${state}`} />;
      })}
    </div>
  );
}
