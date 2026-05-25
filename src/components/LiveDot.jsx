import React from 'react';
import './LiveDot.css';

export default function LiveDot({ label = 'EN DIRECT', status = 'live', size = 'md' }) {
  return (
    <div className={`live-wrap live-${size} live-${status}`}>
      <span className="live-dot" />
      <span className="live-label">{label}</span>
    </div>
  );
}
