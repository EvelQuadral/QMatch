import React from 'react';
import './Logo.css';

export default function Logo({ size = 'md' }) {
  return (
    <div className={`logo logo-${size}`} aria-label="QMatch">
      <img src="/logo.svg" alt="QMatch" />
    </div>
  );
}
